# The Advanced Query Builder

The advanced query builder in QueryTree is a visual programming language for building database queries by connecting logic blocks together in a chain. It can be used to build more powerful queries in than the default query builder.

## Enabling

The advanced query builder is not enabled by default, as some users would find it too advanced to use. However, it can be easily enabled by setting the `AllowAdvancedQuery` setting to `true` in the appsettings.config file (see [here](/docs/customizing.md) for more information) or by setting the Customization__AllowAdvancedQuery environment variable to "true".

Once enabled, a link to the Advanced Query Builder will be available at the top of the default query builder.

## The Tools

Queries can be build by connecting any number of the following tools or nodes togehter:

* *Data Table*: All queries need to start with at least one data table tool. This tool is used to load data in from a table in the database. The tool's options window allows you to pick which table to load data from.
* *Join*: Data from two sources (e.g. Data Table tools) can be combined using the Join tool. This tool's options window allows you to specify what kind of join is used.
* *Filter*: This tool allows users to filter out rows that are not wanted.
* *Append*: This tool allows users to combine two sets of rows into a single list. Unlike most other tools, the Append tool can have any number of inputs. By combining multiple Filter tools into one Append tool, complex filtering logic can be achieved.
* *Extract*: This tool is useful for extracting blocks of text from inside other columns, e.g. extracting the year from a date field.
* *Summerize*: This tool can be used for calculating the sum, average, maximum, minimum or median value of one or more columns, and for grouping rows by distinct elements.
* *Select*: This tool can be used to pick which columns are shown, and in what order.
* *Sort*: This tool can be used to sort rows by one or more columns.
* *Pie Chart*: This tool can be used to display a pie charting summarizing the rows in its input data.
* *Bar Chart*: This tool can be used to display a bar charting summarizing the rows in its input data.
* *Line Chart*: This tool can be used to display a line charting summarizing the rows in its input data.

