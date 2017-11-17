using System;
using Xunit;
using QueryTree.Engine;
using System.Collections.Generic;

namespace QueryTree.Engine.Tests
{
    public class SelectTests
    {
		private string NodesJson
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
                        ""Inputs"": [""1""],
                        ""Type"": ""Select"",
                        ""IncludedColumnIndexes"": [1,0],
                        ""ColumnAliases"": [""The Name"",""The ID""]
                    }
                ]";
			}
		}

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
							new MockColumnInfo() { DataType = "varchar", Name = "Name" }
						}
					}
				};
			}
		}

		[Fact]
		public void TestMySQLSelect()
		{
			var query = new Query(
				DatabaseType.MySQL,
				NodesJson,
				DatabaseInfo);

			var sql = query.GetSql("2");

			Assert.True(sql.Contains("`Name` AS Column_0"), "SQL Value was: " + sql);
			Assert.True(sql.Contains("`ID` AS Column_1"), "SQL Value was: " + sql);
		}
    }
}