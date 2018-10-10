using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Security.Cryptography;
using System.Collections.Generic;
using Microsoft.AspNetCore.Hosting;
using QueryTree.Models;
using Microsoft.Extensions.PlatformAbstractions;
using Newtonsoft.Json;
using MimeKit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Caching.Memory;

namespace QueryTree.Managers
{

	#region

	public interface IEmailSenderManager {
		void Send( string messageId, MimeMessage message );
	}

	public sealed class MessageSentInfo {

		public MessageSentInfo( string messageId, DateTime sentTimeUtc ) {
			MessageId = messageId;
			SentTimeUtc = sentTimeUtc;
		}

		public string MessageId { get; }
		public DateTime SentTimeUtc { get; }
	}

	public sealed class EmailSenderManager : IEmailSenderManager {

		private readonly object _locker = new object();
		private readonly Dictionary<string, MessageSentInfo> _info = new Dictionary<string, MessageSentInfo>();

		private readonly IEmailSender _emailSender;

		public EmailSenderManager( IEmailSender emailSender ) {
			_emailSender = emailSender;
		}

		public void Send( string messageId, MimeMessage message ) {

			MessageSentInfo info;
			if( !_info.TryGetValue( messageId, out info ) || info.SentTimeUtc.AddMinutes( 1 ) <= DateTime.UtcNow ) {
				lock( _locker ) {
					if( !_info.TryGetValue( messageId, out info ) || info.SentTimeUtc.AddMinutes( 1 ) <= DateTime.UtcNow ) {
						_info.Add( messageId, new MessageSentInfo( messageId, DateTime.UtcNow ) );
						_emailSender.SendMail( message );
					}
				}
			}

		}

	}

	#endregion


	public interface IScheduledEmailManager
    {
        void BuildScheduledEmail(string queryName, string editUrl, string recipients, int queryId);
    }


    public class ScheduledEmailManager : IScheduledEmailManager
    {
		private readonly IEmailSenderManager _emailSenderManager;
		private IEmailSender _emailSender;
        private IConfiguration _config;
        private ApplicationDbContext _db;
        private DbManager _dbMgr;
        private IHostingEnvironment _env;
        private ConvertManager _convertManager;


        public ScheduledEmailManager(
			IEmailSenderManager emailSenderManager,
			IEmailSender emailSender,
            IConfiguration config, 
            ApplicationDbContext db,
            IHostingEnvironment env,
            IMemoryCache cache,
            IPasswordManager passwordManager)
        {
			_emailSenderManager = emailSenderManager;
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

                //_emailSender.SendMail(message);
				_emailSenderManager.Send( queryId + recipients, message ); //TODO: get an ID
            }
		}
    }
}