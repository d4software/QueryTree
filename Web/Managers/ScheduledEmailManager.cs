using System.IO;
using System.Linq;
using System.Collections.Generic;
using Microsoft.AspNetCore.Hosting;
using QueryTree.Models;
using Newtonsoft.Json;
using MimeKit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Caching.Memory;
using QueryTree.Services;

namespace QueryTree.Managers
{
    public interface IScheduledEmailManager
    {
        void BuildScheduledEmail(string queryName, string editUrl, string recipients, int queryId);
    }


    public class ScheduledEmailManager : IScheduledEmailManager
    {
		private readonly IEmailSenderService _emailSenderService;
		private readonly IEmailSender _emailSender;
		private readonly IConfiguration _config;
		private readonly ApplicationDbContext _db;
		private readonly DbManager _dbMgr;
		private readonly IWebHostEnvironment _env;
		private readonly ConvertManager _convertManager;


		public ScheduledEmailManager(
			IEmailSenderService emailSenderService,
			IEmailSender emailSender,
			IConfiguration config, 
            ApplicationDbContext db,
            IWebHostEnvironment env,
            IMemoryCache cache,
            IPasswordManager passwordManager)
        {
			_emailSenderService = emailSenderService;
            _emailSender = emailSender;
            _config = config;
            _db = db;
            _env = env;
            _dbMgr = new DbManager(passwordManager, cache, config);
            _convertManager = new ConvertManager();
        }

		public void BuildScheduledEmail(string queryName, string editUrl, string recipients, int queryId)
		{
			if (string.IsNullOrEmpty(recipients))
			{
				return;
			}

			if(!_emailSenderService.TrySetDelivered(queryId)) 
			{
				return;
			}

			var query = _db.Queries
                .Include(q => q.DatabaseConnection)
                .FirstOrDefault(q => q.QueryID == queryId);
                
            if (query != null && query.QueryDefinition != null)
            {
                var queryDefinition = JsonConvert.DeserializeObject<dynamic>(query.QueryDefinition);
                var nodes = JsonConvert.SerializeObject(queryDefinition.Nodes);
                var selectedNodeId = queryDefinition.SelectedNodeId.ToString();

                var data = _dbMgr.GetData(query.DatabaseConnection, nodes, selectedNodeId, null, null);

                var attachment = _convertManager.ToExcel(data);

                var message = new MimeKit.MimeMessage();

                foreach (var email in recipients.Split(','))
                    message.To.Add(new MailboxAddress(email));

                message.From.Add(new MailboxAddress("QueryTree", _config.GetValue<string>("Email:SenderAddress")));
                message.Subject = string.Format("Here's your scheduled report {0}", queryName);

                // load template
                string text = System.IO.File.ReadAllText(Path.Combine(_env.WebRootPath, @"../EmailTemplates/ScheduledReport.txt"));
                string html = System.IO.File.ReadAllText(Path.Combine(_env.WebRootPath, @"../EmailTemplates/ScheduledReport.html"));

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
    }
}