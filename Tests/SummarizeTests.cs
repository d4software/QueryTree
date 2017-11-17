using System;
using Xunit;
using QueryTree.Engine;
using System.Collections.Generic;

namespace QueryTree.Engine.Tests
{
    public class SummarizeTests
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
                    }," +
                    // Count Aggregation
                    @"{
                        ""Id"": ""2"",
                        ""Inputs"": [""1""],
                        ""Type"": ""Summarize"",
                        ""GroupByColumnIndexes"": [],
                        ""AggColumnIndexes"": [],
                        ""GroupByFunctions"": [],
                        ""AggFunctions"": [""1""]
                    }," +
                    // Sum Aggregation
                    @"{
                        ""Id"": ""3"",
                        ""Inputs"": [""1""],
                        ""Type"": ""Summarize"",
                        ""GroupByColumnIndexes"": [],
                        ""AggColumnIndexes"": [""1""],
                        ""GroupByFunctions"": [],
                        ""AggFunctions"": [""2""]
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
        public void TestCount()
        {
            var query = new Query(
                DatabaseType.SQLServer,
                NodesJson,
                DatabaseInfo);

            var sql = query.GetSql("2");

            Assert.True(sql.Contains("SELECT COUNT(*) AS Column_0"), "SQL Value was: " + sql);
        }

        [Fact]
        public void TestSum()
        {
            var query = new Query(
                DatabaseType.SQLServer,
                NodesJson,
                DatabaseInfo);

            var sql = query.GetSql("3");

            Assert.True(sql.Contains("SELECT SUM(Column_1) AS Column_0"), "SQL Value was: " + sql);
        }
    }
}