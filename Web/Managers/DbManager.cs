using MySql.Data.MySqlClient;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Npgsql;
using QueryTree.Models;
using System;
using System.Collections.Generic;
using Microsoft.Extensions.Configuration;
using System.Data.Common;
using System.Data.SqlClient;
using System.Linq;
using Microsoft.Extensions.Caching.Memory;
using QueryTree.Enums;
using QueryTree.ViewModels;
using System.Text.RegularExpressions;


namespace QueryTree.Managers
{
    public class DbManager
    {
        private IPasswordManager _passwordManager;
        private IMemoryCache _cache;
        private IConfiguration _config;

        public DbManager(IPasswordManager passwordManager, IMemoryCache cache, IConfiguration config)
        {
            _passwordManager = passwordManager;
            _cache = cache;
            _config = config;
        }

        private DbTable GetDbTable(DatabaseType type, DbConnection conn, int connectionId, string databaseName, string tableName)
        {
            string key = string.Format("DbTable:{0}:{1}", connectionId, tableName);
            DbTable existingDbTable = null;

            if (_cache.TryGetValue(key, out existingDbTable))
            {
                if (existingDbTable != null)
                {
                    return existingDbTable;
                }
            }

            DbTable result = new DbTable
            {
                Name = tableName
            };

            DbCommand cmd = null;
            switch (type)
            {
                case DatabaseType.MySQL:
                    {
                        string sql = "SELECT COLUMN_NAME, DATA_TYPE"
                            + " FROM INFORMATION_SCHEMA.COLUMNS"
                            + " WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table";
                        cmd = CreateCommand(type, conn, sql);
                        cmd.Parameters.Add(new MySqlParameter("@schema", databaseName));
                        cmd.Parameters.Add(new MySqlParameter("@table", tableName));
                    }
                    break;
                case DatabaseType.PostgreSQL:
                    {
                        var tableNameParts = tableName.Split('.');
                        string schema, table;
                        if (tableNameParts.Length == 1)
                        {
                            schema = "public";
                            table = tableNameParts.First();
                        }
                        else
                        {
                            schema = tableNameParts.First();
                            table = tableNameParts.Last();
                        }

                        string sql = "SELECT COLUMN_NAME, DATA_TYPE"
                            + " FROM INFORMATION_SCHEMA.COLUMNS"
                            + " WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table";
                        cmd = CreateCommand(type, conn, sql);
                        cmd.Parameters.Add(new NpgsqlParameter("@schema", schema));
                        cmd.Parameters.Add(new NpgsqlParameter("@table", table));
                    }
                    break;
                case DatabaseType.SQLServer:
                    {
                        var tableNameParts = tableName.Split('.');
                        string schema, table;
                        if (tableNameParts.Length == 1)
                        {
                            schema = "dbo";
                            table = tableNameParts.First();
                        }
                        else
                        {
                            schema = tableNameParts.First();
                            table = tableNameParts.Last();
                        }

                        string sql = "SELECT COLUMN_NAME, DATA_TYPE"
                            + " FROM INFORMATION_SCHEMA.COLUMNS"
                            + " WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table";
                        cmd = CreateCommand(type, conn, sql);
                        cmd.Parameters.Add(new SqlParameter("@schema", schema));
                        cmd.Parameters.Add(new SqlParameter("@table", table));
                    }
                    break;
            }

            using (var reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    result.Columns.Add(new QueryTree.Models.DbColumn
                    {
                        Name = reader.GetString(0),
                        DataType = reader.GetString(1)
                    });
                }
            }

            _cache.Set(key, result, DateTime.Now.AddHours(1));

            return result;
        }

        public DbModel GetDbModel(DatabaseConnection connection)
        {
            DbModel result = null;
            string error = null;
            TryUseDbConnection(connection, (dbConn) =>
            {
                result = GetDbModel(connection.Type, dbConn, connection.DatabaseConnectionID, connection.DatabaseName);
            }, out error);
            return result;
        }

        private DbModel GetDbModel(DatabaseType type, DbConnection conn, int connectionId, string databaseName)
        {
            string key = string.Format("DbTables:{0}", connectionId);
            DbModel existingDbTable = null;

            if (_cache.TryGetValue(key, out existingDbTable))
            {
                if (existingDbTable != null)
                {
                    return existingDbTable;
                }
            }

            DbCommand cmd = null;
            switch (type)
            {
                case DatabaseType.MySQL:
                    {
                        string sql = "SELECT NULL AS TABLE_SCHEMA, C.TABLE_NAME, C.COLUMN_NAME, C.DATA_TYPE, CASE WHEN PK.COLUMN_NAME IS NOT NULL THEN true ELSE false END AS PRIMARY_KEY "
                            + "FROM INFORMATION_SCHEMA.COLUMNS AS C "
                            + "LEFT JOIN ( "
                            + "            SELECT KU.TABLE_CATALOG, KU.TABLE_SCHEMA, KU.TABLE_NAME, KU.COLUMN_NAME "
                            + "            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS TC "
                            + "            INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS KU "
                            + "                ON TC.CONSTRAINT_TYPE = 'PRIMARY KEY' "
                            + "                   AND TC.CONSTRAINT_CATALOG = KU.CONSTRAINT_CATALOG "
                            + "                   AND TC.TABLE_SCHEMA = KU.TABLE_SCHEMA "
                            + "                   AND TC.TABLE_NAME = KU.TABLE_NAME "
                            + "                   AND TC.CONSTRAINT_NAME = KU.CONSTRAINT_NAME "
                            + "         )  AS PK "
                            + "         ON C.TABLE_CATALOG = PK.TABLE_CATALOG "
                            + "            AND C.TABLE_SCHEMA = PK.TABLE_SCHEMA "
                            + "            AND C.TABLE_NAME = PK.TABLE_NAME "
                            + "            AND C.COLUMN_NAME = PK.COLUMN_NAME "
                            + "WHERE C.TABLE_SCHEMA = @schema "
                            + "ORDER BY C.TABLE_NAME, COLUMN_NAME;";
                        cmd = CreateCommand(type, conn, sql);
                        cmd.Parameters.Add(new MySqlParameter("@schema", databaseName));
                    }
                    break;
                case DatabaseType.PostgreSQL:
                    {
                        string sql = "SELECT C.TABLE_SCHEMA, C.TABLE_NAME, C.COLUMN_NAME, C.DATA_TYPE, CAST(CASE WHEN PK.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS PRIMARY_KEY "
                            + "FROM INFORMATION_SCHEMA.COLUMNS AS C "
                            + "LEFT JOIN ( "
                            + "            SELECT KU.TABLE_CATALOG, KU.TABLE_SCHEMA, KU.TABLE_NAME, KU.COLUMN_NAME "
                            + "            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS TC "
                            + "            INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS KU "
                            + "                ON TC.CONSTRAINT_TYPE = 'PRIMARY KEY' "
                            + "                    AND TC.CONSTRAINT_NAME = KU.CONSTRAINT_NAME "
                            + "         )  AS PK "
                            + "         ON C.TABLE_CATALOG = PK.TABLE_CATALOG "
                            + "            AND C.TABLE_SCHEMA = PK.TABLE_SCHEMA "
                            + "            AND C.TABLE_NAME = PK.TABLE_NAME "
                            + "            AND C.COLUMN_NAME = PK.COLUMN_NAME "
                            + "WHERE C.TABLE_SCHEMA <> 'information_schema' AND C.TABLE_SCHEMA <> 'pg_catalog' "
                            + "ORDER BY C.TABLE_SCHEMA, C.TABLE_NAME, C.COLUMN_NAME;";
                        cmd = CreateCommand(type, conn, sql);
                    }
                    break;
                case DatabaseType.SQLServer:
                    {
                        string sql = "SELECT C.TABLE_SCHEMA, C.TABLE_NAME, C.COLUMN_NAME, C.DATA_TYPE, CAST(CASE WHEN PK.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS PRIMARY_KEY "
                            + "FROM INFORMATION_SCHEMA.COLUMNS AS C "
                            + "LEFT JOIN ( "
                            + "            SELECT KU.TABLE_CATALOG, KU.TABLE_SCHEMA, KU.TABLE_NAME, KU.COLUMN_NAME "
                            + "            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS TC "
                            + "            INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS KU "
                            + "                ON TC.CONSTRAINT_TYPE = 'PRIMARY KEY' "
                            + "                    AND TC.CONSTRAINT_NAME = KU.CONSTRAINT_NAME "
                            + "         )  AS PK "
                            + "         ON C.TABLE_CATALOG = PK.TABLE_CATALOG "
                            + "            AND C.TABLE_SCHEMA = PK.TABLE_SCHEMA "
                            + "            AND C.TABLE_NAME = PK.TABLE_NAME "
                            + "            AND C.COLUMN_NAME = PK.COLUMN_NAME "
                            + "WHERE C.TABLE_SCHEMA <> 'sys' AND C.TABLE_NAME <> '__MigrationHistory' "
                            + "ORDER BY C.TABLE_SCHEMA, C.TABLE_NAME, PK.COLUMN_NAME DESC, C.COLUMN_NAME ";
                        cmd = CreateCommand(type, conn, sql);
                    }
                    break;
            }


            DbModel result = new DbModel
            {
                Name = databaseName
            };

            DbTable currentTable = null;
            using (var reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    string schema = reader.IsDBNull(0) ? (string)null : reader.GetString(0);
                    string tableName = reader.IsDBNull(1) ? (string)null : reader.GetString(1);
                    if (currentTable == null || (currentTable.Name != tableName || currentTable.Schema != schema))
                    {
                        currentTable = new DbTable
                        {
                            Schema = schema,
                            Name = tableName,
                        };

                        switch (type)
                        {
                            case DatabaseType.MySQL:
                                {
                                    currentTable.DisplayName = currentTable.Name;
                                }
                                break;
                            case DatabaseType.PostgreSQL:
                                {
                                    if (currentTable.Schema == null || currentTable.Schema == "public")
                                    {
                                        currentTable.DisplayName = currentTable.Name;
                                    }
                                    else
                                    {
                                        currentTable.DisplayName = currentTable.Schema + "." + currentTable.Name;
                                    }
                                }
                                break;
                            case DatabaseType.SQLServer:
                                {
                                    if (currentTable.Schema == null || currentTable.Schema == "dbo")
                                    {
                                        currentTable.DisplayName = currentTable.Name;
                                    }
                                    else
                                    {
                                        currentTable.DisplayName = currentTable.Schema + "." + currentTable.Name;
                                    }
                                }
                                break;
                        }

                        result.Tables.Add(currentTable);
                    }

                    if (tableName == currentTable.Name) 
                    {
                        currentTable.Columns.Add(new QueryTree.Models.DbColumn
                        {
                            Table = currentTable,
                            Name = reader.IsDBNull(2) ? (string)null : reader.GetString(2),
                            DataType = reader.IsDBNull(3) ? (string)null : reader.GetString(3),
                            IsPrimaryKey = reader.GetBoolean(4)
                        });
                    }
                }
            }

            SetDbForeignKeys(result, type, conn, connectionId, databaseName);

            _cache.Set(key, result, DateTime.Now.AddHours(1));

            return result;
        }

        private static void SetDbForeignKeys(DbModel dbModel, DatabaseType type, DbConnection conn, int connectionId, string databaseName)
        {
            var columnLookup = dbModel.Tables.SelectMany(t => t.Columns)
                                      .Select(c => c as Models.DbColumn)
                                      .ToDictionary(c => new DbColumnReference(c.Table.Schema, c.Table.Name, c.Name));

            DbCommand cmd = null;
            switch (type)
            {
                case DatabaseType.MySQL:
                    {
                        string sql = "SELECT NULL AS CHILD_TABLE_SCHEMA, "
                            + "    C.TABLE_NAME AS CHILD_TABLE_NAME, "
                            + "    C.COLUMN_NAME AS CHILD_COLUMN_NAME, "
                            + "    NULL AS PARENT_TABLE_SCHEMA, "
                            + "    P.TABLE_NAME AS PARENT_TABLE_NAME, "
                            + "    P.COLUMN_NAME AS PARENT_COLUMN_NAME "
                            + "FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS AS RC "
                            + "INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS C "
                            + "    ON C.CONSTRAINT_CATALOG = RC.CONSTRAINT_CATALOG "
                            + "        AND C.CONSTRAINT_SCHEMA = RC.CONSTRAINT_SCHEMA "
                            + "        AND C.TABLE_NAME = RC.TABLE_NAME "
                            + "        AND C.CONSTRAINT_NAME = RC.CONSTRAINT_NAME "
                            + "INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS P "
                            + "    ON P.CONSTRAINT_CATALOG = RC.UNIQUE_CONSTRAINT_CATALOG "
                            + "        AND P.CONSTRAINT_SCHEMA = RC.UNIQUE_CONSTRAINT_SCHEMA "
                            + "        AND P.TABLE_NAME = RC.REFERENCED_TABLE_NAME "
                            + "        AND P.CONSTRAINT_NAME = RC.UNIQUE_CONSTRAINT_NAME "
                            + "        AND P.ORDINAL_POSITION = C.ORDINAL_POSITION "
                            + "WHERE C.TABLE_SCHEMA = @schema;";
                        cmd = CreateCommand(type, conn, sql);
                        cmd.Parameters.Add(new MySqlParameter("@schema", databaseName));
                    }
                    break;
                case DatabaseType.PostgreSQL:
                    {
                        string sql = "SELECT C.TABLE_SCHEMA AS CHILD_TABLE_SCHEMA, "
                               + "    C.TABLE_NAME AS CHILD_TABLE_NAME, "
                               + "    C.COLUMN_NAME AS CHILD_COLUMN_NAME, "
                               + "    P.TABLE_SCHEMA AS PARENT_TABLE_SCHEMA, "
                               + "    P.TABLE_NAME AS PARENT_TABLE_NAME, "
                               + "    P.COLUMN_NAME AS PARENT_COLUMN_NAME "
                               + "FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS AS RC "
                               + "INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS C "
                               + "    ON C.CONSTRAINT_CATALOG = RC.CONSTRAINT_CATALOG "
                               + "        AND C.CONSTRAINT_SCHEMA = RC.CONSTRAINT_SCHEMA "
                               + "        AND C.CONSTRAINT_NAME = RC.CONSTRAINT_NAME "
                               + "INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS P "
                               + "    ON P.CONSTRAINT_CATALOG = RC.UNIQUE_CONSTRAINT_CATALOG "
                               + "        AND P.CONSTRAINT_SCHEMA = RC.UNIQUE_CONSTRAINT_SCHEMA "
                               + "        AND P.CONSTRAINT_NAME = RC.UNIQUE_CONSTRAINT_NAME "
                               + "        AND P.ORDINAL_POSITION = C.ORDINAL_POSITION "
                               + "WHERE C.TABLE_SCHEMA <> 'sys' AND P.TABLE_SCHEMA <> 'sys';";
                        cmd = CreateCommand(type, conn, sql);
                    }
                    break;
                case DatabaseType.SQLServer:
                    {
                        string sql = "SELECT C.TABLE_SCHEMA AS CHILD_TABLE_SCHEMA, " 
                            + "    C.TABLE_NAME AS CHILD_TABLE_NAME, "
                            + "    C.COLUMN_NAME AS CHILD_COLUMN_NAME, "
                            + "    P.TABLE_SCHEMA AS PARENT_TABLE_SCHEMA, "
                            + "    P.TABLE_NAME AS PARENT_TABLE_NAME, "
                            + "    P.COLUMN_NAME AS PARENT_COLUMN_NAME "
                            + "FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS AS RC "
                            + "INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS C "
                            + "    ON C.CONSTRAINT_CATALOG = RC.CONSTRAINT_CATALOG "
                            + "        AND C.CONSTRAINT_SCHEMA = RC.CONSTRAINT_SCHEMA "
                            + "        AND C.CONSTRAINT_NAME = RC.CONSTRAINT_NAME "
                            + "INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS P "
                            + "    ON P.CONSTRAINT_CATALOG = RC.UNIQUE_CONSTRAINT_CATALOG "
                            + "        AND P.CONSTRAINT_SCHEMA = RC.UNIQUE_CONSTRAINT_SCHEMA "
                            + "        AND P.CONSTRAINT_NAME = RC.UNIQUE_CONSTRAINT_NAME "
                            + "        AND P.ORDINAL_POSITION = C.ORDINAL_POSITION "
                            + "WHERE C.TABLE_SCHEMA <> 'sys' AND P.TABLE_SCHEMA <> 'sys';";
                        cmd = CreateCommand(type, conn, sql);
                    }
                    break;
            }


            var fkData = new List<Tuple<DbColumnReference, DbColumnReference>>();
            using (var reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    var child = new DbColumnReference(reader.IsDBNull(0) ? (string)null : reader.GetString(0), reader.IsDBNull(1) ? (string)null : reader.GetString(1), reader.IsDBNull(2) ? (string)null : reader.GetString(2));
                    var parent = new DbColumnReference(reader.IsDBNull(3) ? (string)null : reader.GetString(3), reader.IsDBNull(4) ? (string)null : reader.GetString(4), reader.IsDBNull(5) ? (string)null : reader.GetString(5));
                    fkData.Add(new Tuple<DbColumnReference, DbColumnReference>(child, parent));
                }
            }

            foreach(var fk in fkData)
            {
                if (columnLookup.ContainsKey(fk.Item1) && columnLookup.ContainsKey(fk.Item2))
                {
                    var childColumn = columnLookup[fk.Item1];

                    childColumn.Parent = columnLookup[fk.Item2];
                }
            }

            foreach (var table in dbModel.Tables)
            {
                foreach (var column in table.Columns.Select(c => c as Models.DbColumn))
                {
                    DbTable dbTable = null;
                    if (column.IsPrimaryKey == false && column.Parent == null)
                    {
                        dbTable = dbModel.Tables.FirstOrDefault(t => 
                            t.Schema == table.Schema && 
                            ((t.Name.ToLower() + "_id") == column.Name.ToLower()) ||
                            ((t.Name.ToLower() + "id") == column.Name.ToLower()));
                     
                        if (dbTable != null)
                        {
                            column.Parent = dbTable.Columns[0] as Models.DbColumn;
                        }
                    }
                }
            }
        }

        public static List<DbTable> GetTableParents(DbTable table)
        {
            Stack<DbTable> queue = new Stack<DbTable>();
            queue.Push(table);

            HashSet<DbTable> parents = new HashSet<DbTable>();
            
            while (queue.Any())
            {
                var curr = queue.Pop();

                if (parents.Contains(curr) == false)
                {
                    parents.Add(curr);

                    foreach (var col in curr.Columns.Select(c => c as Models.DbColumn))
                    {
                        if (col.Parent != null)
                        {
                            queue.Push(col.Parent.Table);
                        }
                    }
                }
            }

            parents.Remove(table);

            return parents.ToList();
        }

        public DbJoinStructure GetJoinStructure(DbTable table)
        {
            var result = new DbJoinStructure
            {
                DisplayName = table.DisplayName
            };

            foreach(var column in table.Columns.Select(c => c as Models.DbColumn))
            {
                result.Columns.Add(column.Name);
                result.ColumnTypes.Add(column.DataType);
                result.ShowColumns.Add(column.IsPrimaryKey == false && column.Parent == null && column.Name.EndsWith("id", StringComparison.OrdinalIgnoreCase) == false);
            }

            Stack<DbTable> tableQueue = new Stack<DbTable>();
            tableQueue.Push(table);

            Stack<DbJoinStructure> joinQueue = new Stack<DbJoinStructure>();
            joinQueue.Push(result);

            HashSet<DbTable> visited = new HashSet<DbTable>();

            while (tableQueue.Any())
            {
                var currTable = tableQueue.Pop();
                var currJoin = joinQueue.Pop();

                if (visited.Contains(currTable) == false)
                {
                    visited.Add(currTable);

                    foreach (var col in currTable.Columns)
                    {
                        if (col.Parent != null)
                        {
                            tableQueue.Push(col.Parent.Table);

                            // add parent child relation columns to this
                            var parent = new DbJoinStructure
                            {
                                ChildJoinColumn = col.Name,
                                ParentJoinColumn = col.Parent.Name,
                                DisplayName = col.Parent.Table.DisplayName,
                            };

                            foreach (var column in col.Parent.Table.Columns)
                            {
                                parent.Columns.Add(column.Name);
                                parent.ColumnTypes.Add(column.DataType);
                                parent.ShowColumns.Add(column.IsPrimaryKey == false && column.Parent == null);
                            }

                            currJoin.Parents.Add(parent);
                            joinQueue.Push(parent);
                        }
                    }
                }
            }

            return result;
        }

        public bool CheckConnection(DatabaseConnection connection)
        {
            bool result = false;

            string error;
            bool success = TryUseDbConnection(connection, (conn) =>
            {
                DbCommand cmd = null;

                switch (connection.Type)
                {
                    case DatabaseType.MySQL:
                        cmd = CreateCommand(connection.Type, conn, "SHOW VARIABLES LIKE 'version'");
                        break;
                    case DatabaseType.SQLServer:
                        cmd = CreateCommand(connection.Type, conn, "SELECT @@VERSION");
                        break;
                }

                using (var reader = cmd.ExecuteReader())
                {
                    result = reader.HasRows;
                }
            }, out error);

            return success && result;
        }

        public bool TryUseDbConnection(DatabaseConnection connection, Action<DbConnection> action, out string error)
        {
            string password = _passwordManager.GetSecret(SecretType.DatabasePassword.ToString() + "_" + connection.DatabaseConnectionID);
            SshProxyCredentials credentials = null;
            if (connection.UseSsh)
                credentials = new SshProxyCredentials(_passwordManager, connection);
            return TryUseDbConnection(connection.Type, connection.Server, connection.Port, connection.UseSsh, connection.SshServer, connection.SshPort, credentials, connection.Username, password, connection.DatabaseName, action, out error);
        }

        public bool TryUseDbConnection(DatabaseType type, string server, int port, bool useSsh, string sshServer, int? sshPort, SshProxyCredentials credentials, string username, string password, string databaseName, Action<DbConnection> action, out string error)
        {
            error = null;
            bool databaseAccessDenied = false;
            try
            {
                if (useSsh)
                {
                    return SSHProxyManager.TryUseProxy(server, port, sshServer, sshPort.GetValueOrDefault(22), credentials,
                        proxy =>
                        {
                            using (var conn = GetDbConnection(type, proxy.ProxyServer, proxy.ProxyPort, username, password, databaseName))
                            {
                                action(conn);
                            }
                        }, out error);
                }
                else
                {
                    using (var conn = GetDbConnection(type, server, port, username, password, databaseName))
                    {
                        action(conn);
                        return true;
                    }
                }
            }
            catch (MySqlException e)
            {
                if (e.InnerException != null && e.InnerException.Message != null && e.InnerException.Message.StartsWith("Access denied"))
                {
                    databaseAccessDenied = true;
                }
                else
                {
                    throw;
                }
            }
            catch (SqlException e)
            {
                error = e.Message;
            }
            catch (Exception e)
            {
                error = e.Message;
            }

            if (databaseAccessDenied)
            {
                error = string.Format("Access denied for user='{0}'. Please check username and password are correct.", username);
            }
            return error == null;
        }

        public bool TryUseDbConnection(DatabaseType type, string server, int port, bool useSsh, string sshServer, int? sshPort,  SshProxyCredentials credentials, string username, string password, string databaseName, out string error)
        {
            return TryUseDbConnection(type, server, port, useSsh, sshServer, sshPort, credentials, username, password, databaseName, conn => { return; }, out error);
        }

        private static DbConnection GetDbConnection(DatabaseType type, string server, int port, string username, string password, string databaseName)
        {
            DbConnection conn = null;

            switch (type)
            {
                case DatabaseType.MySQL:
                    conn = new MySqlConnection(string.Format("server={0};port={1};uid={2};pwd={3};database={4};Convert Zero Datetime=True;SslMode=Preferred", server, port, username, password, databaseName));
                    conn.Open();
                    break;
                case DatabaseType.PostgreSQL:
                    conn = new NpgsqlConnection(string.Format("Host={0};Port={1};Username={2};Password={3};Database={4}", server, port, username, password, databaseName));
                    conn.Open();
                    break;
                case DatabaseType.SQLServer:
                    conn = new SqlConnection(string.Format("Server=tcp:{0},{1};Initial Catalog={2};User ID={3};Password={4};Encrypt=True;TrustServerCertificate=True;", server, port, databaseName, username, password));
                    conn.Open();
                    break;
            }

            return conn;
        }

        public static DbCommand CreateCommand(DatabaseType type, DbConnection conn, string commandText)
        {
            DbCommand cmd = null;

            switch (type)
            {
                case DatabaseType.MySQL:
                    cmd = new MySqlCommand(commandText, conn as MySqlConnection);
                    break;
                case DatabaseType.PostgreSQL:
                    cmd = new NpgsqlCommand(commandText, conn as NpgsqlConnection);
                    break;
                case DatabaseType.SQLServer:
                    cmd = new SqlCommand(commandText, conn as SqlConnection);
                    break;
            }

            return cmd;
        }

        // Sometimes DbDataReader.GetDataTypeName returns a length specifier, which isn't useful
        // to QueryTree, is different to the GetDbModel data and breaks things. This removes it
        private string RemoveLengthSpecifier(string databaseType)
        {
            var re = new Regex("\\([0-9]*\\)$");
            return re.Replace(databaseType, "");
        }

        public QueryResponse GetData(DatabaseConnection connection, string nodes, string nodeId, int? startRow, int? rowCount)
        {
            var data = new QueryResponse() { Status = "ok" };

            string error;
            bool success = TryUseDbConnection(connection, (dbCon) =>
            {
                var dbModel = GetDbModel(connection);

                var tableNames = ExtractTableNamesFromNodes(nodes).ToList();
                var dbTables = dbModel.Tables.Where(t => tableNames.Contains(t.DisplayName)).Select(t => t as Engine.ITableInfo).ToList();

                bool logQueries = _config.GetValue<bool>("LogQueries", false);

                var engine = new Engine.Query((Engine.DatabaseType)connection.Type, nodes, dbTables);

                using (var cmd = DbManager.CreateCommand(connection.Type, dbCon, engine.GetSql(nodeId, startRow, rowCount)))
                {
                    using (var reader = cmd.ExecuteReader())
                    {
                        for (int i = 0; i < reader.FieldCount; i++)
                        {
                            data.Columns.Add(reader.GetName(i));
                            data.ColumnTypes.Add(RemoveLengthSpecifier(reader.GetDataTypeName(i)));
                        }

                        while (reader.Read())
                        {
                            var row = new List<object>();
                            for (int i = 0; i < reader.VisibleFieldCount; i++)
                            {
                                object val = reader.GetValue(i);
                                if (val == DBNull.Value)
                                {
                                    row.Add(null);
                                }
                                else
                                {
                                    row.Add(val);
                                }
                            }
                            data.Rows.Add(row);
                        }

                        if (logQueries)
                        {
                            data.Query = cmd.CommandText;
                        }
                    }
                }

                using (var cmd = DbManager.CreateCommand(connection.Type, dbCon, engine.GetRowCountSql(nodeId)))
                {
                    // we don't know if the scalar will be an int/long/other so we have to convert to avoid an unboxing error
                    data.RowCount = (long)Convert.ChangeType(cmd.ExecuteScalar(), typeof(long));
                }

            }, out error);

            if (!success)
            {
                data = new QueryResponse() { Status = "error", ErrorText = error };
            }

            return data;
        }

        private static List<string> ExtractTableNamesFromNodes(string nodeJson)
        {
            List<string> results = new List<string>();
            JArray nodes = JsonConvert.DeserializeObject(nodeJson) as JArray;
            if (nodes != null)
            {
                for (int i = 0; i < nodes.Count; i++)
                {
                    var node = nodes[i] as JObject;

                    if (node != null)
                    {
                        JValue nodeType = node["Type"] as JValue;
                        if (nodeType != null && nodeType.Value != null && nodeType.Value.ToString() == "Data Table")
                        {
                            JValue tableName = node["Table"] as JValue;
                            if (tableName != null && tableName.Value != null)
                            {
                                string tableNameStr = tableName.Value.ToString();
                                if (results.Contains(tableNameStr) == false)
                                {
                                    results.Add(tableNameStr);
                                }
                            }
                        }
                    }
                }
            }

            return results;
        }
    }
}