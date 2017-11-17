using Newtonsoft.Json;
using QueryTree.Enums;
using QueryTree.Managers;
using QueryTree.Models;
using QueryTree.ViewModels;
using System;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Text;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.EntityFrameworkCore;
using Hangfire;
using Microsoft.Extensions.Configuration;
using MimeKit;

namespace QueryTree.Controllers
{
    public class ApiController : Controller
    {
        protected ApplicationDbContext db;
        private readonly ConvertManager convertManager;
        private IMemoryCache _cache;
        private IPasswordManager _passwordManager;
        private DbManager _dbMgr;
        private IConfiguration _config;
        private IEmailSender _emailSender;
        private IHostingEnvironment _env;

        public ApiController(
            ApplicationDbContext dbContext,
            IMemoryCache cache, 
            IPasswordManager passwordManager, 
            IConfiguration config, 
            IEmailSender emailSender,
            IHostingEnvironment env)
        {
            db = dbContext;
            _passwordManager = passwordManager;
            _cache = cache;
            _config = config;
            _emailSender = emailSender;
            _env = env;
            _dbMgr = new DbManager(passwordManager, cache, config);
            this.convertManager = new ConvertManager();
        }

        private DatabaseConnection GetConnection(int databaseId)
        {
            return db.DatabaseConnections.Include(d => d.SshKeyFile).SingleOrDefault(d => d.DatabaseConnectionID == databaseId);
        }

        public class NodeCacheObject
        {
            public int DatabaseId { get; set; }
            public string Nodes { get; set; }
        }

        [HttpPost]
        public ActionResult Nodes(int databaseId, string nodes, string id = null)
        {
            if (id == null)
            {
                id = "Query:" + Guid.NewGuid().ToString("N");
            }

            var data = new NodeCacheObject() { DatabaseId = databaseId, Nodes = nodes };

            _cache.Set(id, data, DateTime.Now.AddHours(1));

            return Json(new { id = id });
        }


        public ActionResult Connection(int DatabaseId)
        {
            var connection = GetConnection(DatabaseId);
            var statusText = _dbMgr.CheckConnection(connection) ? "ok" : "error";

            return Json(new { status = statusText });
        }


        public ActionResult Tables(int databaseId)
        {
            var connection = GetConnection(databaseId);

            var dbModel = _dbMgr.GetDbModel(connection);
            if (dbModel != null)
            {
                var tables = dbModel.Tables.Select(t => t.DisplayName).ToList();
                return Json(tables);
            }

            return this.NotFound();
        }

        public ActionResult Joins(int DatabaseId, string tableName)
        {
            var connection = GetConnection(DatabaseId);

            var dbModel = _dbMgr.GetDbModel(connection);

            if (dbModel != null && dbModel.Tables.Any(t => t.DisplayName == tableName))
            {
                var table = dbModel.Tables.First(t => t.DisplayName == tableName);
                if (table != null)
                {
                    var joinStructure = _dbMgr.GetJoinStructure(table);
                    return Json(joinStructure);
                }
            }

            return this.NotFound();
        }

        public ActionResult Data(string id, string nodeId, int? startRow = null, int? rowCount = null)
        {
            NodeCacheObject cacheObj = null;

            if (_cache.TryGetValue(id, out cacheObj) == false)
            {
                return NotFound("Nodes were not found, please store the nodes by calling POST /api/Nodes");
            }

            var connection = GetConnection(cacheObj.DatabaseId);

            var data = _dbMgr.GetData(connection, cacheObj.Nodes, nodeId, startRow, rowCount);

            return Json(data);
        }

        public ActionResult Export(string id, string nodeId, int? startRow = null, int? rowCount = null)
        {
			NodeCacheObject cacheObj = null;

			if (_cache.TryGetValue(id, out cacheObj) == false)
			{
				return NotFound("Nodes were not found, please store the nodes by calling POST /api/Nodes");
			}

            var connection = GetConnection(cacheObj.DatabaseId);

            var data = _dbMgr.GetData(connection, cacheObj.Nodes, nodeId, startRow, rowCount);

            var result = this.convertManager.ToExcel(data);

            return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "export.xlsx");
        }

        private byte[] ToUTF8(string text)
        {
            // this adds utf byte mark. See http://stackoverflow.com/questions/4414088/how-to-getbytes-in-c-sharp-with-utf8-encoding-with-bom/4414118#4414118
            var data = Encoding.UTF8.GetBytes(text);
            return Encoding.UTF8.GetPreamble().Concat(data).ToArray();
        }

        [HttpPost]
        public ActionResult TestConn(int type, string server, int port, string username, string password, string databaseName, bool useSsh, int? sshPort, string sshUsername, string sshPassword, int? SshKeyFileID, bool UseSshKey, int? databaseConnectionId = null)
        {
            DatabaseType dbType = (DatabaseType)type;

            // When testing a saved connection, if no new passwords are entered, load the saved values
            if (databaseConnectionId.HasValue)
            {
                if (password == null)
                {
                    password = _passwordManager.GetSecret(SecretType.DatabasePassword + "_" + databaseConnectionId.Value);
                }

                if (sshPassword == null)
                {
                    sshPassword = _passwordManager.GetSecret(SecretType.SSHPassword + "_" + databaseConnectionId.Value);
                }
            }

            SshProxyCredentials credentials = null;
            if (useSsh)
            {
                if (UseSshKey)
                {
                    var key = db.SshKeyFiles.Where(s => s.Id == SshKeyFileID).First();
                    credentials = new SshProxyCredentials(_passwordManager, sshUsername, key);
                }
                else
                {
                    credentials = new SshProxyCredentials(_passwordManager, sshUsername, sshPassword);
                }
            }
            
            string error = null;
            if (_dbMgr.TryUseDbConnection(dbType, server, port, useSsh, sshPort, credentials, username, password, databaseName, out error))
            {
                return Json(new { Message = "Success" });
            }
            else
            {

                return Json(new { Message = error });
            }
        }

        [HttpPost]
        public async Task<ActionResult> Schedule(ScheduledReportViewModel model)
        {
            var query = await this.db.Queries.FindAsync(model.QueryID);
            if (query == null)
            {
                return BadRequest("Select the Report");
            }

            if (model.FrequencyScheduled == FrequencyScheduled.None)
            {
                // Remove schedule
                var schedule = await this.db.ScheduledReports.FirstOrDefaultAsync(m => m.ScheduleID == model.QueryID);
                if (schedule != null)
                {
                    this.db.ScheduledReports.Remove(schedule);
                    await this.db.SaveChangesAsync();
                }

                // Remove schedule job
                this.RemoveScheduleJob(model.QueryID.ToString());

                return StatusCode((int)HttpStatusCode.OK);
            }

            if (model.FrequencyScheduled == FrequencyScheduled.Monthly &&
                (!model.DayOfMonth.HasValue || model.DayOfMonth < 1 || model.DayOfMonth > 32))
            {
                return BadRequest("Select the correct Day of the Month");
            }

            DateTime dateValue;
            if (!DateTime.TryParseExact(model.Time, "hh:mm tt", CultureInfo.InvariantCulture, DateTimeStyles.None, out dateValue))
            {
                return BadRequest("Select the correct Time");
            }

            Regex regex = new Regex(@"^(?!.*<[^>]+>).*");
            if (!regex.IsMatch(model.Recipients))
            {
                return BadRequest("No html tags allowed");
            }

            var recipients = this.RecipientsValidation(model.Recipients);
            if(string.IsNullOrEmpty(recipients))
            {
                return BadRequest("Wrong 'Recipients' format. Only e-mails are separated by comma");
            }

            ScheduledReport scheduleReport = await this.db.ScheduledReports.FirstOrDefaultAsync(m => m.ScheduleID == model.QueryID);

            if (scheduleReport == null)
            {
                scheduleReport = new ScheduledReport
                {
                    FrequencyScheduled = model.FrequencyScheduled,
                    Time = dateValue.TimeOfDay,
                    DayOfWeek = model.DayOfWeek,
                    DayOfMonth = model.DayOfMonth,
                    Recipients = recipients,
                    Query = query
                };

                this.db.ScheduledReports.Add(scheduleReport);
            }
            else
            {
                scheduleReport.FrequencyScheduled = model.FrequencyScheduled;
                scheduleReport.Time = dateValue.TimeOfDay;
                scheduleReport.DayOfWeek = model.DayOfWeek;
                scheduleReport.DayOfMonth = model.DayOfMonth;
                scheduleReport.Recipients = recipients;

                this.db.Entry(scheduleReport).State = EntityState.Modified;
            }

            await this.db.SaveChangesAsync();

            this.AddOrUpdateScheduleTask(scheduleReport);

            return StatusCode((int)HttpStatusCode.OK);
        }

        private void AddOrUpdateScheduleTask(ScheduledReport scheduledReport)
        {
            string editUrl = Url.Action("Details", "Queries", new { id = scheduledReport.Query.QueryID }, Request.Scheme);

            AddOrUpdateScheduleJob(scheduledReport, editUrl);
        }

		public void AddOrUpdateScheduleJob(ScheduledReport schedule, string editUrl)
		{
			if (schedule.FrequencyScheduled == FrequencyScheduled.Daily)
			{
				var period = string.Format("{0} {1} * * *", schedule.Time.Value.Minutes, schedule.Time.Value.Hours);
				this.AddOrUpdateJob(schedule, editUrl, period);
			}

			if (schedule.FrequencyScheduled == FrequencyScheduled.Weekly)
			{
				var period = string.Format("{0} {1} * * {2}", schedule.Time.Value.Minutes, schedule.Time.Value.Hours, (int)schedule.DayOfWeek);
				this.AddOrUpdateJob(schedule, editUrl, period);
			}

			if (schedule.FrequencyScheduled == FrequencyScheduled.Monthly)
			{
				var period = string.Format("{0} {1} {2} * *", schedule.Time.Value.Minutes, schedule.Time.Value.Hours, (int)schedule.DayOfMonth);
				this.AddOrUpdateJob(schedule, editUrl, period);
			}
		}

		public void RemoveScheduleJob(string scheduleId)
		{
			RecurringJob.RemoveIfExists(scheduleId);
		}

		private void AddOrUpdateJob(ScheduledReport schedule, string editUrl, string period)
		{
			RecurringJob.AddOrUpdate(schedule.ScheduleID.ToString(), () => BuildScheduledEmail(schedule.Query.Name, editUrl, schedule.Recipients, schedule.Query.QueryID), period);
		}

		public void BuildScheduledEmail(string queryName, string editUrl, string recipients, int queryId)
		{
			if (string.IsNullOrEmpty(recipients))
			{
				return;
			}
            using (var _db = (ApplicationDbContext)HttpContext.RequestServices.GetService(typeof(ApplicationDbContext)))
            {
                var query = _db.Queries.Find(queryId);
                var queryDefinition = JsonConvert.DeserializeObject<dynamic>(query.QueryDefinition);
                var nodes = JsonConvert.SerializeObject(queryDefinition.Nodes);
                var selectedNodeId = queryDefinition.SelectedNodeId.ToString();

                var data = _dbMgr.GetData(query.DatabaseConnection, nodes, selectedNodeId, null, null);

                var attachment = convertManager.ToExcel(data);

                var message = new MimeKit.MimeMessage();

                foreach (var email in recipients.Split(','))
                    message.To.Add(new MailboxAddress(email));

                message.From.Add(new MailboxAddress("QueryTree", _config.GetValue<string>("Email:SenderAddress")));
                message.Subject = string.Format("Here's your scheduled report {0}", queryName);

                // load template
                string text = System.IO.File.ReadAllText(Path.Combine(_env.WebRootPath, @"/EmailTemplates/ScheduledReport.txt"));
                string html = System.IO.File.ReadAllText(Path.Combine(_env.WebRootPath, @"/EmailTemplates/ScheduledReport.html"));

                // set up replacements
                var replacements = new Dictionary<string, string>
                {
                    { "{reportname}", queryName },
                    { "{editurl}", editUrl }
                };

                // do replacement
                foreach (var key in replacements.Keys)
                {
                    text = text.Replace(key, replacements[key]);
                    html = html.Replace(key, replacements[key]);
                }

                var builder = new BodyBuilder();

                builder.TextBody = text;
                builder.HtmlBody = html;

                using (var stream = new MemoryStream(attachment))
                {
                    var fileName = queryName == null || queryName.Length == 0 ? "report" : queryName;
                    builder.Attachments.Add(string.Format("{0}.xlsx", fileName), stream);
                }

                message.Body = builder.ToMessageBody();

                _emailSender.SendMail(message);
            }
		}

        private string RecipientsValidation(string recipients)
        {
            recipients = recipients.Replace(" ", String.Empty);
            var emails = recipients.Split(',');

            string strRegex = @"^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}" + @"\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\" + @".)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$";
            Regex re = new Regex(strRegex);

            foreach (var email in emails)
            {
                if (!re.IsMatch(email))
                {
                    return null;
                }
            }

            return string.Join(", ", emails);
        }

        [HttpGet]
        public async Task<JsonResult> Schedule(int id)
        {
            var result = await this.db.ScheduledReports.FirstOrDefaultAsync(m => m.ScheduleID == id);
            ScheduledReportViewModel model = null;

            if (result == null)
            {
                model = new ScheduledReportViewModel();
            }
            else
            {
                model = new ScheduledReportViewModel(result);
            }

            return this.Json(model);
        }

        [HttpGet]
        public ActionResult QueryData(int queryId, int draw, int start, int length)
        {
            var query = db.Queries
                .Include(q => q.DatabaseConnection)
                .ThenInclude(c => c.SshKeyFile)
                .FirstOrDefault(q => q.QueryID == queryId);

            // TODO: Check user has access to this query

            if (query == null)
            {
                return BadRequest("Select the Report");
            }

            var queryDefinition = JsonConvert.DeserializeObject<dynamic>(query.QueryDefinition);
            var nodes = JsonConvert.SerializeObject(queryDefinition.Nodes);
            var selectedNodeId = queryDefinition.SelectedNodeId.ToString();

            var data = _dbMgr.GetData(query.DatabaseConnection, nodes, selectedNodeId, start, length);
            var rows = data.Rows;
            var totalCount = data.RowCount;

            var dataTable = new {draw = draw, recordsTotal = totalCount, recordsFiltered = totalCount, data = rows};

            return Json(dataTable);
        }

        [HttpGet]
        public ActionResult QueryColumnsName(int queryId)
        {
            var query = db.Queries
                .Include(q => q.DatabaseConnection)
                .ThenInclude(c => c.SshKeyFile)
                .FirstOrDefault(q => q.QueryID == queryId);
            
            // TODO: Check user has access to this query

            if (query == null)
            {
                return BadRequest("Select the Report");
            }

            var queryDefinition = JsonConvert.DeserializeObject<dynamic>(query.QueryDefinition);
            var nodes = JsonConvert.SerializeObject(queryDefinition.Nodes);
            var selectedNodeId = queryDefinition.SelectedNodeId.ToString();

            var data = _dbMgr.GetData(query.DatabaseConnection, nodes, selectedNodeId, 0, 0);

            return Json(data.Columns);
        }

        [HttpGet]
        public ActionResult ExportQuery(int id)
        {
            var query = db.Queries
                .Include(q => q.DatabaseConnection)
                .ThenInclude(c => c.SshKeyFile)
                .FirstOrDefault(q => q.QueryID == id);

            // TODO: Check the user has access to this query

            if (query == null)
            {
                return NotFound("Data were not found");
            }
            var queryDefinition = JsonConvert.DeserializeObject<dynamic>(query.QueryDefinition);
            var nodes = JsonConvert.SerializeObject(queryDefinition.Nodes);
            var selectedNodeId = queryDefinition.SelectedNodeId.ToString();

            var data = _dbMgr.GetData(query.DatabaseConnection, nodes, selectedNodeId, null, null);

            var result = this.convertManager.ToExcel(data);

            return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "export.xlsx");
        }
    }
}