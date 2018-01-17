# QueryTree

QueryTree is an ad-hoc reporting tool that works with any Microsoft 
SQL Server, PostgreSQL or MySQL database. It allows users to query 
databases, build reports and schedule those reports to email distribution
lists, without needing to write any code.

For more information see the [QueryTree website](http://querytreeapp.com)

## Features

QueryTree can connect to MySQL and PostgreSQL databases using SSH tunnels, 
secured with passwords or key files.

Supports customization of the logo image, system name and CSS used
within the app.

Can use either Sqlite or Microsoft SQL Server database for it's own user
and reports data storage. 

Database and SSH passwords are stored in its database in encryped form, 
using AES encryption. Users may provide their own key file, or let the
system generate one on first run. Keys can be shared between mutliple
web servers in a load balancing scenario.

Users may choose to build their own plugins to store database/SSH 
passwords in an external key vault. This is achieved by implementing 
a .NET interface and registering the class in the appSettings.config 
file. See [Building a password manager](https://github.com/d4software/QueryTree/wiki/Building-a-password-manager)
for more information.

## Running QueryTree

### Running from Binaries

QueryTree is built using .NET Core. To run QueryTree on your server
you will need to install the .NET Core 2.0.x runtime. You can download
the installer [here](https://www.microsoft.com/net/download/core#/runtime).

To verify that you have the .NET runtime installed, open a terminal/cmd
window and type

```
dotnet --version
```

If the command returns a version number, you're ready to run QueryTree.
If not, please visit [https://www.microsoft.com/net/download/core#/runtime]()
and follow the instructions for your platform.

Once the dotnet runtime is installed, follow these steps:

1. Download the release and unpack the files into a folder of your choice.

2. Open a terminal/cmd window and cd into the folder containing the unpacked QueryTree release files.

3. At the command prompt, type:

```
dotnet QueryTree.dll
```

4. Visit [http://localhost:5000/]() in your browser. You should see the QueryTree application.

5. For use in production environments, QueryTree should be run behind a reverse proxy such as nginx. For more information on hosting QueryTree using nginx see: https://docs.microsoft.com/en-us/aspnet/core/publishing/linuxproduction?tabs=aspnetcore1x

You can also host QueryTree using IIS. For information on running .NET Core apps
in IIS see: https://docs.microsoft.com/en-us/aspnet/core/publishing/iis?tabs=aspnetcore1x

### Running from Source

To run QueryTree from it's source code, you will need to install the .NET Core SDK. You can download
the SDK for your platform here: [https://www.microsoft.com/net/download/core]()

Once the .NET Core SDK is installed, follow these steps:

1. Clone this repo into a folder

2. At the command prompt, cd into the folder, then into the "Web" folder.

3. Type:
 
```sh
dotnet run
```
 
4. Visit [http://localhost:5000/]() in your browser. You should see the QueryTree application. *Dotnet may decide to run it on a different port if 5000 is not available, check your terminal output.

If you would like to run QueryTree with your own local development settings, you can add a Web/usersettings.json file containing a modified copy of appsettings.json. Settings in this file will override appsettings.json. However, this file will be ignored by git.

### Running the Tests

To run the automated tests in this project, cd into the "Tests" folder, then type:

```
dotnet test
```

## Getting Started

1. When first run, QueryTree will have no users and no database connections. Visiting
app, you will be presented with a login page:

![The QueryTree login page](http://querytreeapp.com/img/screenshots/querytree-login.png "The QueryTree login page")

2. Click the "Sign up as a new user" button, and enter your details to create a new account.

![The QueryTree signup page](http://querytreeapp.com/img/screenshots/querytree-signup.png "The QueryTree signup page")

3. Having signed in, you won't have any database connections configured. The system
will ask you whether you want to set up a connection yourself, or invite another user
who might be able to do it for you.

![The QueryTree onboard page](http://querytreeapp.com/img/screenshots/querytree-onboarding.png "The QueryTree onboarding page")

4. Assuming you have a database that you can connect to, select the "+ Connect Database" 
option. You will see the Create Connection page:

![The QueryTree create connection page](http://querytreeapp.com/img/screenshots/querytree-create-connection.png "The QueryTree create connection page")

Once all the information is entered, you can check the connection by pressing the
"Test Connection" button. If the system reports that the conneciton is working,
press "Save".

![The QueryTree test connection feature](http://querytreeapp.com/img/screenshots/querytree-test-connection.png "The QueryTree test connection feature")

5. You will be taken to the reports list for this connection, but there won't be
any reports yet.

![The QueryTree reports page](http://querytreeapp.com/img/screenshots/querytree-reports-empty.png "The QueryTree reports page")

6. Click on "+ Create Report". You will be taken to the defualt report builder

7. All reports start by picking a datbase table to start from. From there
the report builder will prompt you to select any related tables that it can
join to. For example, in this screenshot, I have selected the "orders" table
and QueryTree is prompting me to join the "users" table. QueryTree can see
that "orders" has a link to "users" so it offers to join the tables.

![The QueryTree create report page](http://querytreeapp.com/img/screenshots/querytree-create-report-orders.png "The QueryTree create report page")

For more information on how to help QueryTree automatically join between tables
in your database see [QueryTree's Auto Join feature](https://github.com/d4software/QueryTree/wiki/Auto-Join)

8. Having selected a starting table, and any relevant related tables, click Next.
The filter panel will open and you will be prompted to add one or more Filters.

![The QueryTree report filter panel](http://querytreeapp.com/img/screenshots/querytree-report-filter.png "The QueryTree report filter panel")

9. Once you are happy with the filters, you have the option to summarize the data
that is being shown in the results panel. Summerizing the data can mean totaling, 
averaging, counting or finding the minimum/maximum values, for one or more columns.
You can do this for all the data, or for different groups of values. For example, 
you could find the average value of the orders, for each country.

![The QueryTree report summerize panel](http://querytreeapp.com/img/screenshots/querytree-report-summerize.png "The QueryTree report summerize panel")

10. Finally, you have the option of generating a chart from the data in the results
panel.

![The QueryTree report chart panel](http://querytreeapp.com/img/screenshots/querytree-report-chart.png "The QueryTree report chart panel")

11. Once you are happy with your report, save it by clicking the Save button. You
will be returned to the list of reports for this connection.

## Other Guides

 * [Scheduling Reports](https://github.com/d4software/QueryTree/wiki/Scheduling-Reports)
 * [Sharing Individual Reports](https://github.com/d4software/QueryTree/wiki/Sharing-Individual-Reports)
 * [Team Management](https://github.com/d4software/QueryTree/wiki/Team-Management)
 * [The Advanced Query Builder](https://github.com/d4software/QueryTree/wiki/The-Advanced-Query-Builder)
 * [Auto Join](https://github.com/d4software/QueryTree/wiki/Auto-Join)
 * [Customising QueryTree](https://github.com/d4software/QueryTree/wiki/Customising-QueryTree)
 * [Building a password manager](https://github.com/d4software/QueryTree/wiki/Building-a-password-manager)

## License

QueryTree is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

QueryTree is licensed under the LGPLv3 license. See the LICENSE.md 
file for more information.

QueryTree is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with QueryTree.  If not, see [http://www.gnu.org/licenses/]().
