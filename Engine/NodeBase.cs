using System;
using System.Collections.Generic;
using System.Text;
using System.Linq;

namespace QueryTree.Engine
{
    public enum DatabaseType
    {
        MySQL = 0,
        PostgreSQL = 3,
        SQLServer = 1
    }
    
    public abstract class NodeBase
    {
        public DatabaseType DatabaseType = DatabaseType.MySQL;

        public string ClientId { get; set; }

        protected List<int> SortColumnIndexes = new List<int>() { 0 };
        protected List<bool> SortDirections = new List<bool>() { true }; // True == ascending

		/// <summary>
		/// Returns a SQL query which will be used to define a view. This view 
		/// will be selected from by the NodeBase.get_select_sql code.The 
		/// results of that will be passed via the process_data method before 
		/// being returned to the client
		/// </summary>
		/// <returns>The query string.</returns>
		public abstract string GetQuerySql();
		
        public abstract bool IsConfigured();

		public virtual void UpdateSettings(Dictionary<string, object> settings)
        {

		}

        protected string GetSortColumns()
        {
            return String.Join(",", Enumerable.Range(0, SortColumnIndexes.Count).Select(i => string.Format("Column_{0:D} {1}", SortColumnIndexes[i], GetSortDirection(i))));
        }

        protected string QuoteName(string name)
        {
            switch (DatabaseType)
            {
                case DatabaseType.SQLServer:
                    return "[" + name + "]";
                case DatabaseType.PostgreSQL:
                    return "\"" + name + "\"";
                default:
                    return "`" + name + "`";
            }
        }

        protected virtual string GetSelectColumns()
        {
            var i = 0;
            return String.Join(",", GetColumns().Select(c => string.Format("Column_{0:D} AS {1}", i++, QuoteName(c))));
        }

        protected string GetSortDirection(int i)
        {
            if (SortDirections.Count > i && SortDirections[i])
            {
                return "ASC";
            }
            else
            {
                return "DESC";
            }
        }

        protected bool IsNumberType(string colType)
        {
            var numericDataTypes = new List<string>() { "INTEGER", "INT", "SMALLINT", "TINYINT", "MEDIUMINT", "BIGINT", "DECIMAL", "NUMERIC", "FLOAT", "DOUBLE", "REAL", "MONEY", "SMALLMONEY", "DOUBLE PRECISION", "SMALLSERIAL", "SERIAL", "BIGSERIAL" };

            switch (DatabaseType) {
                case DatabaseType.PostgreSQL:
                    // POSTGRES TYPES = ["SMALLINT", "INTEGER", "BIGINT", "DECIMAL", "NUMERIC", "REAL", "DOUBLE PRECISION", "SMALLSERIAL", "SERIAL", "BIGSERIAL", "MONEY"]

                case DatabaseType.SQLServer:
                case DatabaseType.MySQL:
                    return numericDataTypes.Contains(colType.ToUpper());
            }

            return false;
        }

        protected bool IsTextType(string colType)
        {
            var quotedTypes = new List<string>() { "VARCHAR", "NVARCHAR", "CHAR", "NCHAR", "ENUM", "XML", "CHARACTER VARYING", "CHARACTER", "TEXT", "USER-DEFINED", "LONGTEXT" };

            switch (DatabaseType)
            {
                case DatabaseType.PostgreSQL:
                // # POSTGRES TYPES = ["CHARACTER VARYING", "VARCHAR", "CHARACTER", "CHAR", "TEXT", "TIMESTAMP WITHOUT TIME ZONE", "TIMESTAMP WITH TIME ZONE", "DATE", "TIME WITHOUT TIME ZONE", "TIME WITH TIME ZONE", "INTERVAL", "USER-DEFINED"]

                case DatabaseType.SQLServer:
                case DatabaseType.MySQL:
                    return quotedTypes.Contains(colType.ToUpper());
            }

            return false;
        }

        protected bool IsBoolType(string colType)
        {
            var quotedTypes = new List<string>() { "BIT", "BOOL", "BOOLEAN" };

            switch (DatabaseType)
            {
                case DatabaseType.PostgreSQL:
                case DatabaseType.SQLServer:
                case DatabaseType.MySQL:
                    return quotedTypes.Contains(colType.ToUpper());
            }

            return false;
        }

        protected bool IsQuotedType(string colType)
        {
            return IsTextType(colType) || IsDateType(colType);
        }

        protected bool IsDateType(string colType)
        {
			var dateTypes = new List<string>() { "DATE", "DATETIME", "TIMESTAMP WITHOUT TIME ZONE", "TIMESTAMP", "TIMESTAMP WITH TIME ZONE", "TIME WITHOUT TIME ZONE", "TIME WITH TIME ZONE", "INTERVAL" };

			switch (DatabaseType)
			{
				case DatabaseType.PostgreSQL:
				// # POSTGRES TYPES = ["TIMESTAMP WITHOUT TIME ZONE", "TIMESTAMP WITH TIME ZONE", "DATE", "TIME WITHOUT TIME ZONE", "TIME WITH TIME ZONE", "INTERVAL"]

				case DatabaseType.SQLServer:
				case DatabaseType.MySQL:
					return dateTypes.Contains(colType.ToUpper());
			}

			return false;
        }

        protected bool IsCaseTyoStringType(string colType)
        {
			var castToStringTypes = new List<string>() { "XML", "USER-DEFINED" };

			switch (DatabaseType)
			{
				case DatabaseType.PostgreSQL:
				case DatabaseType.SQLServer:
				case DatabaseType.MySQL:
					return castToStringTypes.Contains(colType.ToUpper());
			}

			return false;
        }

        protected virtual string GetSelectSql(int? count = null, int? skip = null)
        {
            var sql = string.Format("SELECT * FROM {0}", GetNodeAlias());

            if (count.HasValue && skip.HasValue)
            {
                sql += string.Format(" LIMIT {0:D},{1:D}", skip, count);
            }

            return sql;
        }

        internal virtual string GetColumnName(int colNumber)
        {
            return string.Format("{0}.Column_{1:D}", GetNodeAlias(), colNumber);
        }

        internal virtual string GetNodeAlias()
        {
            return string.Format("node_{0}", ClientId.Replace("-", "_"));
        }

        internal virtual string GetTableAlias()
        {
            return string.Format("table_{0}", ClientId.Replace("-", "_"));
        }

        public virtual IList<string> GetColumns()
        {
            throw new NotImplementedException("Derived classes should implement the GetColumns method");
        }

        public virtual IList<string> GetColumnTypes()
        {
            throw new NotImplementedException("Derived classes should implement the GetColumnTypes method");
        }

        private static string BuildWithSql(IEnumerable<NodeBase> orderedUpstreamDependencies)
        {
            var query = new StringBuilder("WITH ");
            var separator = "";

            foreach (var dependency in orderedUpstreamDependencies)
            {
                query.AppendFormat("{0}{1} AS ({2})", separator, dependency.GetNodeAlias(), dependency.GetQuerySql());
                separator = ",";
            }
            return query.ToString();
        }

        internal virtual void FetchOrderedDependencies(IList<NodeBase> dependencies)
        {
            if (dependencies.Contains(this))
            {
                dependencies.Remove(this);
            }
            
            dependencies.Insert(0, this);
        }

        public string GetFetchDataQuery(int? startRow = null, int? rowCount = null)
        {
            var query = new StringBuilder();

            if (DatabaseType == DatabaseType.MySQL)
            {
                query.AppendFormat("SELECT {0} FROM ({1} ORDER BY {2}) AS results",
                    GetSelectColumns(),
                    GetQuerySql(), 
                    GetSortColumns());

                if (startRow.HasValue && rowCount.HasValue)
                {
                    query.AppendFormat(" LIMIT {0:D}, {1:D}", startRow, rowCount);
                }
            }
            else if (DatabaseType == DatabaseType.SQLServer || DatabaseType == DatabaseType.PostgreSQL)
            {
                IList<NodeBase> nodes = new List<NodeBase>();
                FetchOrderedDependencies(nodes);
                query.Append(BuildWithSql(nodes));

                if (startRow.HasValue && rowCount.HasValue)
                {
                    // In order for this to work, we will need a ROW_NUMBER column in the CTE, which we
                    // don"t select in the following query but which we use in a "WHERE row_num BETWEEN x AND y"
                    // clause. To make this work we"ll need all nodes to have a default sort column which
                    // we put into the ROW_NUMBER"s ORDER BY clause. The Sort node would then override that sort
                    // column with the user selected column

                    query.AppendFormat(",{0}_with_row_num AS (SELECT *, ROW_NUMBER() OVER (ORDER BY {1}) AS ROW_NUM FROM {2})",
                        GetNodeAlias(),
                        GetSortColumns(),
                        GetNodeAlias());

                    query.AppendFormat("SELECT {0} FROM {1}_with_row_num WHERE row_num BETWEEN {2:D} AND {3:D}",
                        GetSelectColumns(),
                        GetNodeAlias(),
                        startRow.Value + 1, startRow.Value + rowCount.Value);
				}
                else 
                {
                    query.AppendFormat("SELECT {0} FROM {1}",
                        GetSelectColumns(),
                        GetNodeAlias());    
                }
                
                query.AppendFormat(" ORDER BY {0}", GetSortColumns());
            }

            return query.ToString();
        }

        public string GetCountQuerySql()
        {
            var query = new StringBuilder();
        
            if (DatabaseType == DatabaseType.SQLServer || DatabaseType == DatabaseType.PostgreSQL)
            {
				IList<NodeBase> nodes = new List<NodeBase>();
				FetchOrderedDependencies(nodes);
				query.Append(BuildWithSql(nodes));
            }

            query.AppendFormat("SELECT COUNT(*) FROM ({0}) as {1}", GetQuerySql(), GetNodeAlias());

            return query.ToString();
		}

        internal string GetDependencySql()
        {
            if (DatabaseType == DatabaseType.SQLServer || DatabaseType == DatabaseType.PostgreSQL)
            {
                return GetNodeAlias();
            }
            else 
            {
                return string.Format("({0}) AS {1}", GetQuerySql(), GetNodeAlias());
            }
        }
    }
}
