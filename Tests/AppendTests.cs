using System;
using Xunit;
using QueryTree.Engine;
using System.Collections.Generic;

namespace QueryTree.Engine.Tests
{
    public class AppendTests
    {
        private List<ITableInfo> DatabaseInfo
		{
			get
			{
				return new List<ITableInfo>()
				{
					new MockTableInfo()
					{
						DisplayName = "employees",
						Columns = new List<IColumnInfo>()
						{
							new MockColumnInfo() { DataType = "int", Name = "ID" },
							new MockColumnInfo() { DataType = "varchar", Name = "Name" },
							new MockColumnInfo() { DataType = "int", Name = "department_id" }
						}
					},
                    new MockTableInfo()
					{
						DisplayName = "departments",
						Columns = new List<IColumnInfo>()
						{
							new MockColumnInfo() { DataType = "int", Name = "ID" },
							new MockColumnInfo() { DataType = "varchar", Name = "Name" }
						}
					}
				};
			}
		}

        private string NodesJsonWithComplexAppend
		{
			get
			{
				return @"[
                    {
                        ""Id"": ""1"",
                        ""Type"": ""Data Table"",
                        ""Table"": ""employees""
                    },
                    {
                        ""Id"": ""2"",
                        ""Type"": ""Data Table"",
                        ""Table"": ""departments""
                    },
                    {
                        ""Id"": ""3"",
                        ""Inputs"": [""1"",""2""],
                        ""Type"": ""Join"",
                        ""JoinType"": ""Inner"",
                        ""Table1Column"": ""department_id"",
                        ""Table2Column"": ""ID""
                    },
                    {
                        ""Id"": ""4"",
                        ""Inputs"": [""3""],
                        ""Type"": ""Filter"",
                        ""FilterColumnIndex"": 0,
                        ""Operator"": ""EqualTo"",
                        ""FilterValue1"": ""1""
                    },
                    {
                        ""Id"": ""5"",
                        ""Inputs"": [""3""],
                        ""Type"": ""Filter"",
                        ""FilterColumnIndex"": 0,
                        ""Operator"": ""EqualTo"",
                        ""FilterValue1"": ""2""
                    },
                    {
                        ""Id"": ""6"",
                        ""Inputs"": [""4"",""5""],
                        ""Type"": ""Append"",
                        ""IncludeUniqueColumns"": true
                    }
                ]";
			}
		}

        [Fact]
		public void TestMultipleRoutesToDataTablesDoesntDefineThemTwice()
		{
			var query = new Query(
				DatabaseType.PostgreSQL,
				NodesJsonWithComplexAppend,
				DatabaseInfo);

			var sql = query.GetSql("6");

            // count how many times "node_1" is defined
            int c = 0;
            int i = -1;
            while ((i = sql.IndexOf("node_1 AS", i+1)) >= 0)
                c++;
            
            // The "node_1" datatable should only be defined once in the query
			Assert.Equal(1, c);
		}
    }
}