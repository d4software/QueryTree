using System;
using System.Collections.Generic;
using System.Linq;

namespace QueryTree.Engine
{
    public enum JoinType
    {
        Inner,
        LeftOuter,
        RightOuter,
        FullOuter,
        Cross
    }
    
    public class JoinNode : DataProcessorNode, ICollapsibleQueryNode
    {
        private JoinType JoinType;
        private string Table1Column;
        private string Table2Column;

        public override string GetQuerySql()
        {
			var table1 = InputDict[Inputs[0]];
            var table1Cols = table1.GetColumns();
			var table2 = InputDict[Inputs[1]];
            var table2Cols = table2.GetColumns();

            var sql = "SELECT ";

            // Build the unified column list, aliasing each column as Column_1, Column_2 as we go.
            var colNum = 0;
            var separator = "";

            for (var sourceColNum = 0; sourceColNum < table1Cols.Count(); sourceColNum++)
            {
                if (table1 is ICollapsibleQueryNode)
                {
                    sql += string.Format("{0}{1} AS Column_{2:D}", separator, (table1 as ICollapsibleQueryNode).GetRawColumnName(sourceColNum), colNum);
                }
                else
                {
                    sql += string.Format("{0}{1} AS Column_{2:D}", separator, table1.GetColumnName(sourceColNum), colNum);
                }

                separator = ",";
                colNum += 1;
            }

            for (var sourceColNum = 0; sourceColNum < table2Cols.Count(); sourceColNum++)
            {
                if (table2 is DatabaseTableNode)
                {
                    sql += string.Format("{0}{1} AS Column_{2:D}", separator, (table2 as DatabaseTableNode).GetRawColumnName(sourceColNum), colNum);
                }
                else
                {
                    sql += string.Format("{0}{1} AS Column_{2:D}", separator, table2.GetColumnName(sourceColNum), colNum);
                }

                colNum += 1;
            }

            // Get the FROM xxx JOIN yyy ON xxx.col = yyy.col bit
            sql += GetTableFrom();
            return sql;
        }

        public override bool IsConfigured()
        {
            var columns = GetColumns();
            return Inputs.Count == 2
                && columns.Count > 0
                && columns.Contains(Table1Column)
                && columns.Contains(Table2Column);
        }

        public override void UpdateSettings(Dictionary<string, object> settings)
        {
            base.UpdateSettings(settings);

            if (settings.ContainsKey("JoinType"))
            {
                JoinType = (JoinType)Enum.Parse(typeof(JoinType), (string)settings["JoinType"]);
            }

            if (settings.ContainsKey("Table1Column"))
            {
                Table1Column = (string)settings["Table1Column"];
            }

            if (settings.ContainsKey("Table2Column"))
            {
                Table2Column = (string)settings["Table2Column"];
            }
        }

        public override IList<string> GetColumns()
        {
            if (Inputs.All(i => InputDict.ContainsKey(i)))
            {
                var input1 = InputDict[Inputs[0]];
                var input2 = InputDict[Inputs[1]];

                var result = new List<string>();
                result.AddRange(input1.GetColumns().Select(c => c));
                result.AddRange(input2.GetColumns().Select(c => c));

                return result;
            }
            else
            {
                return new List<string>();
            }
		}

        public override IList<string> GetColumnTypes()
        {
            if (Inputs.All(i => InputDict.ContainsKey(i)))
            {
                var input1 = InputDict[Inputs[0]];
                var input2 = InputDict[Inputs[1]];

                var result = new List<string>();
                result.AddRange(input1.GetColumnTypes().Select(c => c));
                result.AddRange(input2.GetColumnTypes().Select(c => c));
                return result;
            }
            else
            {
                return new List<string>();
            }
        }

		/// <summary>
		/// If this join's inputs are themselves data tables or joins, delegates
        /// to them. Otherwise call the default implementation.
		/// </summary>
		/// <returns>The raw column name.</returns>
		/// <param name="colNumber">Col number.</param>
		public string GetRawColumnName(int colNumber)
        {
			var input1 = InputDict[Inputs[0]];
			var input2 = InputDict[Inputs[1]];

            if (colNumber < input1.GetColumns().Count)
            {
                if (input1 is ICollapsibleQueryNode)
                {
                    return (input1 as ICollapsibleQueryNode).GetRawColumnName(colNumber);
                }
                else
                {
                    return input1.GetColumnName(colNumber);
                }
            }
            else
            {
                if (input2 is DatabaseTableNode)
                {
                    return (input2 as DatabaseTableNode).GetRawColumnName(colNumber - input1.GetColumns().Count);
                }
                else
                {
                    return input2.GetColumnName(colNumber - input1.GetColumns().Count);
                }   
            }
        }

		/// <summary>
		/// Build the FROM xxx JOIN yyy ON xxx.col = yyy.col part of the JOIN 
        /// query.
        /// 
        /// If the inputs are themselves data tables or other joins, collapses 
        /// the query without using CTEs or inline views(in MySQL).
        /// </summary>
        /// <returns>The table from.</returns>
		public string GetTableFrom()
        {
            string sql;
            string joiningCol;
            string table2FromClause;

			var table1 = InputDict[Inputs[0]];
            var table2 = InputDict[Inputs[1]];

			var x = table1.GetColumns().IndexOf(Table1Column);
			var y = table2.GetColumns().IndexOf(Table2Column);

            if (table1 is ICollapsibleQueryNode)
            {
                sql = (table1 as ICollapsibleQueryNode).GetTableFrom();
                joiningCol = string.Format("ON {0} = ", (table1 as ICollapsibleQueryNode).GetRawColumnName(x));
            }
            else
            {
                sql = string.Format(" FROM {0} ", table1.GetDependencySql());
                joiningCol = string.Format("ON {0} = ", table1.GetColumnName(x));
            }

            if (table2 is DatabaseTableNode)
            {
                joiningCol += (table2 as DatabaseTableNode).GetRawColumnName(y);
                table2FromClause = string.Format("{0} AS {1}", (table2 as DatabaseTableNode).GetDatabaseTable(), table2.GetTableAlias());
            }
            else
            {
                joiningCol += table2.GetColumnName(y);
                table2FromClause = table2.GetDependencySql();
            }

            switch (JoinType)
            {
                case JoinType.Inner:
                    sql += string.Format("INNER JOIN {0} {1}", table2FromClause, joiningCol);
                    break;
                case JoinType.LeftOuter:
                    sql += string.Format("LEFT OUTER JOIN {0} {1}", table2FromClause, joiningCol);
                    break;
                case JoinType.RightOuter:
                    sql += string.Format("RIGHT OUTER JOIN {0} {1}", table2FromClause, joiningCol);
                    break;
                case JoinType.FullOuter:
                    var leftJoin = (sql + string.Format("LEFT OUTER JOIN {0} {1}", table2FromClause, joiningCol));
                    var rightJoin = (sql + string.Format("RIGHT OUTER JOIN {0} {1}", table2FromClause, joiningCol));

                    sql = (leftJoin + " UNION " + rightJoin);
                    break;
                case JoinType.Cross:
                    sql += string.Format("CROSS JOIN {0}", table2FromClause);
                    break;
            }

            return sql;
        }
    }
}
