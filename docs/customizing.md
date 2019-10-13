# Customization Options in QueryTree

QueryTree comes with a number of configuration settings that allow you to customize the appearance and behaviour of your installation. Altering these settings does not constitute making changes to the QueryTree code so you do not need to release your configuration changes like you would changes to the source code (see the terms of the [LGPL3](https://en.wikipedia.org/wiki/GNU_Lesser_General_Public_License) license for more information).

The [appsettings.json](/Web/appsettings.json) file contains a section titled “Customization”:

```json
"Customization": {
   "SystemName": "QueryTree",
   "SystemLogo": "/images/querytree_logo.png",
   "ExtraCSS": "",
   "AllowAdvancedQuery": false,
   "DataStore": "Sqlite",
   "BaseUri": "",
   "AuthenticationMode": "Forms"
 }
```

The following section details what each of the settings do:

* *SystemName*: used to set the application name that appears on the top left of all the QueryTree pages. Note: the application will still display a footer which includes the words “Powered by QueryTree”
* *SystemLogo*: contains the URL of an image that will be displayed on the top left of each page. Change this setting to display your own system logo on the top left. This image does not necessarily need to be located inside QueryTree’s wwwroot folder. It could potentially be hosted at a different domain. Note: the application will still display a smaller version of the QueryTree logo in the footer.
* *ExtraCSS*: points to a .css file that will be referenced by all the QueryTree pages, after it’s own CSS. This file does not necessarily need to be located inside QueryTree’s wwwroot folder. It could potentially be hosted at a different domain.
* *AllowAdvancedQuery*: indicated whether users will be given the option to use the advanced query builder. See [here](/docs/advanced.md) for more information.
* *DataStore*: Controls what kind of database QueryTree will store it's configuration data in. Valid options are 'MSSqlServer' or 'Sqlite'. The contents of the ConnectionString setting in the [appsettings.json](/Web/appsettings.json) should be set to an appropriate connection string for this database type.
* *BaseUri*: If you want to run QueryTree from a subfolder on your webserver, e.g. http://my.app.com/reports/, the BaseUri setting should be used to tell QueryTree what location it is running from, e.g. "/reports".
* *AuthenticationMode*: Valid options are "Forms" or "Windows". The default value is "Forms". "Forms" means that users will see "sign up", "sign in" and "sign out" pages. If "Windows" is enabled, those pages will be hidden and users will be automatically signed in using their Windows accounts. This option will only work for Windows clients, and when QueryTree is hosted using IIS, with "Windows Authentication" enabled and "Anonymous Authentication" disabled. See [https://docs.microsoft.com/en-us/iis/configuration/system.webserver/security/authentication/windowsauthentication/]() for more information on configuring IIS.
