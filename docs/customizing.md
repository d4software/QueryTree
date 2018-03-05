QueryTree is open source under the [LGPL3](https://en.wikipedia.org/wiki/GNU_Lesser_General_Public_License) license. This means you can use QueryTree in conjunction with your commercial app without the need to open source your own proprietary code. However, any changes you make to the QueryTree code need to be contributed upstream. Note that this applies only to any QueryTree code you modify and nothing else associated with your app.

QueryTree also comes with a number of configuration settings that allow you to customise the appearance and behaviour of your installation. Altering these settings does not constitute making changes to the QueryTree code so you do not need to release your configuration changes.

## An example

So, for example, QueryTree has options for customisation where you can:

 * Replace the QueryTree logo and system name with your own image and name, and add your own CSS stylesheet to alter the appearance of the QueryTree UI.
 * Set QueryTree up in a virtual folder or subdomain (e.g. “reports/” or “reporting.”). This enables a seamless integration between QueryTree’s interface and your own app. 
 * Link to our QueryTree.Engine DLL library in your app without open sourcing your app. Our engine DLL converts JSON data query definitions created by the QueryTree UI and stored in the QueryTree “Queries” table, into SQL queries that can be run by your app.

## Single Sign On

QueryTree does not currently support any form of Single Sign On system (e.g. OAuth, SAML, LDAP, ActiveDirectory). This is an area the authors of the system would like to develop as we believe it could be used to enable seamless integrations where users move from a database driven app to it’s QueryTree reporting panel, without having to re-enter their email and password.

If you would like to submit pull requests to QueryTree to integrate it with single sign on systems, please go ahead. 

Under the conditions of the LGPL license, if you did any of these customisations you’d need to release the changes made to the QueryTree code. Doing so would keep your app closed source while still enabling you to use QueryTree.

## Technical Details

### Customising QueryTree’s UI

The [appsettings.json](/Web/appsettings.json) file contains a section titled “Customization”:

```
"Customization": {
   "SystemName": "QueryTree",
   "SystemLogo": "/images/querytree_logo.png",
   "ExtraCSS": "",
   "AllowAdvancedQuery": false
 }
```

The following section details what each of the settings do:

 * *SystemName*: used to set the application name that appears on the top left of all the QueryTree pages. Note: the application will still display a footer which includes the words “Powered by QueryTree”
 * *SystemLogo*: contains the URL of an image that will be displayed on the top left of each page. Change this setting to display your own system logo on the top left. This image does not necessarily need to be located inside QueryTree’s wwwroot folder. It could potentially be hosted at a different domain. Note: the application will still display a smaller version of the QueryTree logo in the footer.
 * *ExtraCSS*: points to a .css file that will be referenced by all the QueryTree pages, after it’s own CSS. This file does not necessarily need to be located inside QueryTree’s wwwroot folder. It could potentially be hosted at a different domain.
 * *AllowAdvancedQuery*: indicated whether users will be given the option to use the advanced query builder. See [here](/docs/advanced.md) for more information.


### Using QueryTree’s Engine

The QueryTree.Engine DLL is a dotnet core DLL that converts JSON query definitions that have been created by the QueryTree UI, into SQL queries for a specific database engine.

You will find QueryTree’s saved queries in its Queries table. The QueryDefinition column contains a JSON definition of the query.

The engine can be referenced in your dotnet code and called like this:

```
TODO: move the GetDbModel stuff into the Engine
var query = ...  // fetch row from Queries table
var queryDefinition = JsonConvert.DeserializeObject<dynamic>(query.QueryDefinition);
var nodes = JsonConvert.SerializeObject(queryDefinition.Nodes);
var nodeId = queryDefinition.SelectedNodeId.ToString();

var engine = new Engine.Query(Engine.DatabaseType.MySQL, nodes, dbTables);
var sql = engine.GetSql(nodeId, startRow, rowCount); // startRow and rowCount support paging, pass Null to retrieve all rows
```

