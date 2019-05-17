using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using MailKit.Net.Smtp;
using MailKit;
using MimeKit;
using System.Text;
using QueryTree.Models;
using Microsoft.Extensions.Configuration;


namespace QueryTree
{
    // This class is used by the application to send Email and SMS
    // when you turn on two-factor authentication in ASP.NET Identity.
    // For more details see this link https://go.microsoft.com/fwlink/?LinkID=532713
    public class EmailSender : IEmailSender
    {
        private IConfiguration _config;

        public EmailSender(IConfiguration config)
        {
            _config = config;    
        }
        
        public void SendMail(MimeMessage message)
        {
			using (var client = new SmtpClient())
			{
				// For demo-purposes, accept all SSL certificates (in case the server supports STARTTLS)
				client.ServerCertificateValidationCallback = (s, c, h, e) => true;
				
                client.Connect(_config.GetValue<string>("Email:SmtpHost"), _config.GetValue<int>("Email:SmtpPort"), _config.GetValue<bool>("Email:UseSSL"));

				// Note: only needed if the SMTP server requires authentication
                if(_config.GetValue<bool>("Email:UseAuthentication")){
                    client.Authenticate(_config.GetValue<string>("Email:SmtpUser"), _config.GetValue<string>("Email:SmtpPassword"));
                }

				client.Send(message);
				client.Disconnect(true);
			}
        }
        
		public void SendMail(string to, string subject, string body)
		{
			var email = new MimeMessage();
            email.From.Add(new MailboxAddress("QueryTree", _config.GetValue<string>("Email:SenderAddress")));
			email.To.Add(new MailboxAddress(to));
			email.Subject = subject;
            email.Body = new TextPart("plain") { Text = body };

            SendMail(email);
		}
    }
}
