using System;
using System.Text;
using System.Linq;
using System.Collections.Generic;

namespace QueryTree.Engine
{
    public class DatabaseTableNode : DataSourceNode, ICollapsibleQueryNode, IRequireConfiguration
    {
		public void Configure(IList<ITableInfo> tables)
		{
			if (Table != null)
			{
				Columns = new List<string>();
				ColumnTypes = new List<string>();

				foreach (var table in tables)
				{
					if (table.DisplayName == Table)
					{
						foreach (var column in table.Columns)
						{
							Columns.Add(column.Name);
							ColumnTypes.Add(column.DataType);
						}
					}
				}
			}
		}

        public string Table
        {
            get;
            set;
        }

        public override bool IsConfigured()
        {
            return !string.IsNullOrEmpty(Table);
        }

        public override void UpdateSettings(Dictionary<string, object> settings)
        {
            base.UpdateSettings(settings);

            if (settings.ContainsKey("Table"))
            {
                Table = (string)settings["Table"];
            }
            else
            {
                Table = "";
            }
        }

        /// <summary>
        /// Special version of the GetColumnName for database tables, which 
        /// selects the actual table_name.column_name rather than the aliased 
        /// name(e.g.node_xxx.Column_x).
        /// </summary>
        /// <param name="colNumber">Col number.</param>
        public string GetRawColumnName(int colNumber)
        {
            var col = Columns[colNumber];

            string colSpecifier;

            colSpecifier = string.Format("{0}.{1}", GetTableAlias(), QuoteName(col));

            if (IsCaseTyoStringType(ColumnTypes[colNumber]))
            {
                if (DatabaseType == DatabaseType.SQLServer)
                {
                    colSpecifier = string.Format("CONVERT(NVARCHAR(MAX), {0})", colSpecifier);
                }
                else if (DatabaseType == DatabaseType.PostgreSQL)
                {
                    colSpecifier = string.Format("cast({0} as text)", colSpecifier);
                }
                //else
                //{
                    // MySQL doesn't have any cast to sting types at this stage
                //}
            }
            return colSpecifier;
        }

        protected string GetDbSelectColumns()
        {
            var sql = new StringBuilder();
            var sep = "";

            foreach (var colNumber in Enumerable.Range(0, Columns.Count))
            {
                sql.AppendFormat("{0}{1} AS Column_{2:D}", sep, GetRawColumnName(colNumber), colNumber);
                sep = ",";
            }

            return sql.ToString();
        }

        public string GetDatabaseTable()
        {
            switch (DatabaseType)
            {
                case DatabaseType.SQLServer:
                    // turn 'schema.table' into '[schema].[table]' in case of spaces. Also prevent SQL injection
                    return String.Join(".", Table.Split('.').Select(s => "[" + s.Replace("'", "''") + "]"));
                case DatabaseType.PostgreSQL:
                    // turn 'schema.table' into '[schema].[table]' in case of spaces. Also prevent SQL injection
                    return string.Join(".", Table.Split('.').Select(s => "\"" + s.Replace("'", "''") + "\""));
                case DatabaseType.MySQL:
                    // enclose table name in backquotes, in case of spaces. Also prevent SQL injection
                    return string.Format("`{0}`", Table.Replace("'", "''"));
            }

            return null;
        }

        public string GetTableFrom()
        {
            return string.Format(" FROM {0} AS {1} ", GetDatabaseTable(), GetTableAlias());
        }

        public string GetDatabaseFrom()
        {
            return GetDatabaseTable();  // In most cases, bit after the FROM clause will just be 'FROM XXX', but joins may return 'FROM XXX JOIN YYY ON XXX.A = YYY.B';    
        }

        public override string GetQuerySql()
        {
            return string.Format("SELECT {0} FROM {1} AS {2}", GetDbSelectColumns(), GetDatabaseTable(), GetTableAlias());
        }
    }
}
