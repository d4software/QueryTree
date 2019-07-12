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
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Hangfire;
using Microsoft.Extensions.Configuration;
using MimeKit;
using Microsoft.AspNetCore.Identity;

namespace QueryTree.Controllers
{
    [Authorize]
    public class ApiController : Controller
    {
        protected ApplicationDbContext db;
        private readonly ConvertManager convertManager;
        private IMemoryCache _cache;
        private IPasswordManager _passwordManager;
        private DbManager _dbMgr;
        private IConfiguration _config;
        private IHostingEnvironment _env;
        private IScheduledEmailManager _scheduledEmailManager;
        private ApplicationUser _currentUser;

        protected UserManager<ApplicationUser> _userManager;

        public ApiController(UserManager<ApplicationUser> userManager, 
            ApplicationDbContext dbContext,
            IMemoryCache cache, 
            IPasswordManager passwordManager, 
            IConfiguration config, 
            IScheduledEmailManager scheduledEmailManager,
            IHostingEnvironment env)
        {
            _userManager = userManager;
            db = dbContext;
            _passwordManager = passwordManager;
            _cache = cache;
            _config = config;
            _scheduledEmailManager = scheduledEmailManager;
            _env = env;
            _dbMgr = new DbManager(passwordManager, cache, config);
            this.convertManager = new ConvertManager();
        }

		public ApplicationUser CurrentUser
		{
			get
			{
                if (_currentUser == null)
                {
					string userId = _userManager.GetUserId(User);
					_currentUser = db.ApplicationUsers.FirstOrDefault(u => u.Id == userId);
                }

                return _currentUser;
			}
		}

        private DatabaseConnection GetConnection(int databaseId)
        {
            return db.DatabaseConnections.Include(d => d.SshKeyFile).SingleOrDefault(d => d.DatabaseConnectionID == databaseId);
        }

        #region Connection APIs

        [HttpPost("/api/connections/test/")]
        public ActionResult TestConnection(int type, string server, int port, string username, string password, string databaseName, bool useSsh, string sshServer, int? sshPort, string sshUsername, string sshPassword, int? SshKeyFileID, bool UseSshKey, int? databaseConnectionId = null)
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
            if (_dbMgr.TryUseDbConnection(dbType, server, port, useSsh, sshServer, sshPort, credentials, username, password, databaseName, out error))
            {
                return Json(new { Message = "Success" });
            }
            else
            {

                return Json(new { Message = error });
            }
        }

        private bool CanUserAccessDatabase(DatabaseConnection connection)
        {
            var userPermissions = db.UserDatabaseConnections
                .Where(uc => uc.ApplicationUserID == CurrentUser.Id)
                .ToList();

            if (PermissionMgr.UserCanViewDatabase(userPermissions, connection) == false && connection.OrganisationId != CurrentUser.OrganisationId)
            {
                return false;
            }

            return true;
        }

        [HttpGet("/api/connections/{databaseId}/status/")]
        public ActionResult GetConnectionStatus(int databaseId)
        {
            var connection = GetConnection(databaseId);

            if (CanUserAccessDatabase(connection))
            {            
                var statusText = _dbMgr.CheckConnection(connection) ? "ok" : "error";

                return Json(new { status = statusText });
            }
            
            return NotFound();
        }

        [HttpGet("/api/connections/{databaseId}/tables/")]
        public ActionResult GetTables(int databaseId)
        {
            var connection = GetConnection(databaseId);

            if (CanUserAccessDatabase(connection))
            {
                var dbModel = _dbMgr.GetDbModel(connection);
                if (dbModel != null)
                {
                    var tables = dbModel.Tables.Select(t => t.DisplayName).ToList();
                    return Json(tables);
                }
            }

            return this.NotFound();
        }

        [HttpGet("/api/connections/{databaseId}/tables/{tableName}/joins/")]
        public ActionResult GetJoins(int databaseId, string tableName)
        {
            var connection = GetConnection(databaseId);

            if (CanUserAccessDatabase(connection))
            {
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
            }

            return NotFound();
        }

        #endregion

        #region Cached Queries

        private class NodeCacheObject
        {
            public int DatabaseId { get; set; }
            public string Nodes { get; set; }
        }

        [HttpPost("/api/cache/")]
        public ActionResult SaveQuery(int databaseId, string nodes, string id = null)
        {
            if (id == null)
            {
                id = Guid.NewGuid().ToString("N");
            }

            var data = new NodeCacheObject() { DatabaseId = databaseId, Nodes = nodes };

            _cache.Set(id, data, DateTime.Now.AddHours(1));

            return Json(new { id = id });
        }

        [HttpGet("/api/cache/{id}/{nodeId}/")]
        public ActionResult RunQuery(string id, string nodeId, int? startRow = null, int? rowCount = null)
        {
            NodeCacheObject cacheObj = null;

            if (_cache.TryGetValue(id, out cacheObj) == false)
            {
                return NotFound("Nodes were not found, please store the nodes by calling POST /api/Nodes");
            }

            var connection = GetConnection(cacheObj.DatabaseId);

            if (CanUserAccessDatabase(connection))
            {
                var data = _dbMgr.GetData(connection, cacheObj.Nodes, nodeId, startRow, rowCount);

                return Json(data);
            }
            else 
            {
                return NotFound();
            }
        }

        [HttpGet("/api/cache/{id}/{nodeId}/export/")]
        public ActionResult ExportQuery(string id, string nodeId, int? startRow = null, int? rowCount = null)
        {
			NodeCacheObject cacheObj = null;

			if (_cache.TryGetValue(id, out cacheObj) == false)
			{
				return NotFound("Nodes were not found, please store the nodes by calling POST /api/Nodes");
			}

            var connection = GetConnection(cacheObj.DatabaseId);

            if (CanUserAccessDatabase(connection))
            {
                var data = _dbMgr.GetData(connection, cacheObj.Nodes, nodeId, startRow, rowCount);

                var result = this.convertManager.ToExcel(data);

                return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "export.xlsx");
            }
            
            return NotFound();
        }

        #endregion

        #region Scheduled Reports

        [HttpPost]
        public async Task<ActionResult> Schedule([FromBody]ScheduledReportViewModel model)
        {
            var query = this.db.Queries
                .Include(q => q.DatabaseConnection)
                .FirstOrDefault(q => q.QueryID == model.QueryID);

            if (query != null && CanUserAccessDatabase(query.DatabaseConnection))
            {
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
                if (!DateTime.TryParseExact(model.Time, "h:mm tt", CultureInfo.InvariantCulture, DateTimeStyles.None, out dateValue))
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

            return NotFound();
        }

        private void AddOrUpdateScheduleTask(ScheduledReport scheduledReport)
        {
            string editUrl = Url.Action("Details", "Queries", new { id = scheduledReport.Query.QueryID }, Request.Scheme);

            AddOrUpdateScheduleJob(scheduledReport, editUrl);
        }

		private void AddOrUpdateScheduleJob(ScheduledReport schedule, string editUrl)
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

		private void RemoveScheduleJob(string scheduleId)
		{
			RecurringJob.RemoveIfExists(scheduleId);
		}

		private void AddOrUpdateJob(ScheduledReport schedule, string editUrl, string period)
		{
			RecurringJob.AddOrUpdate(schedule.ScheduleID.ToString(), () => _scheduledEmailManager.BuildScheduledEmail(schedule.Query.Name, editUrl, schedule.Recipients, schedule.Query.QueryID), period);
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
        public async Task<ActionResult> Schedule(int id)
        {
            var result = await this.db.ScheduledReports
                .Include(s => s.Query)
                .Include(s => s.Query.DatabaseConnection)
                .FirstOrDefaultAsync(m => m.ScheduleID == id);
            
            ScheduledReportViewModel model = null;

            if (result == null)
            {
                return Json(new ScheduledReportViewModel());
            }
            else if (CanUserAccessDatabase(result.Query.DatabaseConnection))
            {
                model = new ScheduledReportViewModel(result);
                return Json(model);
            }
            
            return NotFound();
        }

        #endregion

        #region Query APIs

        [HttpPost("/api/getquerydata/{queryId}/")]
        public ActionResult GetData(int queryId, GetDataRequest req)
        {
            var query = db.Queries
                .Include(q => q.DatabaseConnection)
                .ThenInclude(c => c.SshKeyFile)
                .FirstOrDefault(q => q.QueryID == queryId);

            if (query != null && CanUserAccessDatabase(query.DatabaseConnection))
            {
                var queryDefinition = JsonConvert.DeserializeObject<dynamic>(query.QueryDefinition);
                var nodes = JsonConvert.SerializeObject(queryDefinition.Nodes);
                var selectedNodeId = queryDefinition.SelectedNodeId.ToString();

                var data = _dbMgr.GetData(query.DatabaseConnection, nodes, selectedNodeId, req.Start, req.Length);
                var rows = data.Rows;
                var totalCount = data.RowCount;

                var dataTable = new {draw = req.Draw, recordsTotal = totalCount, recordsFiltered = totalCount, data = rows};

                return Json(dataTable);
            }
            
            return NotFound();
        }

        [HttpGet("/api/queries/{queryId}/columns/")]
        public ActionResult QueryColumnsName(int queryId)
        {
            var query = db.Queries
                .Include(q => q.DatabaseConnection)
                .ThenInclude(c => c.SshKeyFile)
                .FirstOrDefault(q => q.QueryID == queryId);
            
            if (query != null && CanUserAccessDatabase(query.DatabaseConnection))
            {
                var queryDefinition = JsonConvert.DeserializeObject<dynamic>(query.QueryDefinition);
                var nodes = JsonConvert.SerializeObject(queryDefinition.Nodes);
                var selectedNodeId = queryDefinition.SelectedNodeId.ToString();

                var data = _dbMgr.GetData(query.DatabaseConnection, nodes, selectedNodeId, 0, 0);

                return Json(data.Columns);
            }
            
            return NotFound();
        }

        [HttpGet("/api/queries/{id}/export/")]
        public ActionResult ExportQuery(int id)
        {
            var query = db.Queries
                .Include(q => q.DatabaseConnection)
                .ThenInclude(c => c.SshKeyFile)
                .FirstOrDefault(q => q.QueryID == id);

            if (query != null && CanUserAccessDatabase(query.DatabaseConnection))
            {
                var queryDefinition = JsonConvert.DeserializeObject<dynamic>(query.QueryDefinition);
                var nodes = JsonConvert.SerializeObject(queryDefinition.Nodes);
                var selectedNodeId = queryDefinition.SelectedNodeId.ToString();

                var data = _dbMgr.GetData(query.DatabaseConnection, nodes, selectedNodeId, null, null);

                var result = this.convertManager.ToExcel(data);

                return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "export.xlsx");
            }

            return NotFound();
        }

        #endregion
    }
}