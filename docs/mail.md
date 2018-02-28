# Use Gmail as your mail sender

You can configure QueryTree to send emails through your Gmail account. You'll need to update the [appsettings.json](Web/appsettings.json)
with your Gmail credentials.

Example:

```json
 "Email": {
    "SmtpHost": "smtp.gmail.com",
    "SmtpUser": "youremail@gmail.com",
    "SmtpPassword": "yourgmailpassword",
    "SenderAddress": "Sender Name <youremail@gmail.com>"
}
```

