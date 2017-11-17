using System;
using Xunit;
using QueryTree.Engine;
using System.Collections.Generic;

namespace QueryTree.Engine.Tests
{
    public class JoinTests
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

        private string NodesJsonCollapsableInnerJoin
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
                    }
                ]";
			}
		}

        [Fact]
		public void TestCollapsableInnerJoin()
		{
			var query = new Query(
				DatabaseType.MySQL,
				NodesJsonCollapsableInnerJoin,
				DatabaseInfo);

			var sql = query.GetSql("3");

			Assert.True(sql.Contains("FROM `employees` AS table_1 INNER JOIN `departments` AS table_2 ON table_1.`department_id` = table_2.`ID`"), "SQL Value was: " + sql);
		}

        private string NodesJsonNonCollapsableInnerJoin
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
                        ""Inputs"": [""2""],
                        ""Type"": ""Filter"",
                        ""FilterColumnIndex"": 1,
                        ""Operator"": ""LessThanOrEqualTo"",
                        ""FilterValue1"": ""m""
                    },
                    {
                        ""Id"": ""4"",
                        ""Inputs"": [""1"",""3""],
                        ""Type"": ""Join"",
                        ""JoinType"": ""Inner"",
                        ""Table1Column"": ""department_id"",
                        ""Table2Column"": ""ID""
                    }
                ]";
			}
		}

        [Fact]
		public void TestNonCollapsableInnerJoin()
		{
			var query = new Query(
				DatabaseType.MySQL,
				NodesJsonNonCollapsableInnerJoin,
				DatabaseInfo);

			var sql = query.GetSql("4");

            Assert.True(sql.Contains("AS table_1 INNER JOIN (SELECT * FROM (SELECT table_2"), "SQL Value was: " + sql);
			Assert.True(sql.Contains("table_1.`department_id` = node_3.Column_0"), "SQL Value was: " + sql);
		}
    }
}