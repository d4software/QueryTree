using System;
using System.Collections.Generic;
using System.Linq;
using MimeKit;

namespace QueryTree
{
    public interface IEmailSender
    {
        void SendMail(MimeMessage message);
        void SendMail(string to, string subject, string body);
    }
}
