# Use Gmail as your mail sender

You can configure QueryTree to send emails through your Gmail account. You'll need to update the [appsettings.json](/Web/appsettings.json)
with your Gmail credentials.

Example:

```json
 "Email": {
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": 465,
    "SmtpUser": "youremail@gmail.com",
    "SmtpPassword": "yourgmailpassword",
    "SenderAddress": "Sender Name <youremail@gmail.com>",
    "UseSSL": true,
    "UseAuthentication": true
}
```

You may need to [create an App Password](https://myaccount.google.com/apppasswords) for QueryTree if you're using 2 Factor Authentication.