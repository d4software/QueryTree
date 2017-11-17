using System;
using Xunit;
using QueryTree.Engine;
using System.Collections.Generic;

namespace QueryTree.Engine.Tests
{
    public class SortTests
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
                        ""Type"": ""Sort"",
                        ""SortColumns"": [""Name"",""ID""],
                        ""SortDirections"": [false,true]
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
        public void TestMySQLSort()
        {
            var query = new Query(
                DatabaseType.MySQL,
                NodesJson,
                DatabaseInfo);

            var sql = query.GetSql("2");

            Assert.True(sql.Contains("ORDER BY Column_1 DESC,Column_0 ASC"), "SQL Value was: " + sql);
        }

        [Fact]
        public void TestSQLServerSort()
        {
            var query = new Query(
                DatabaseType.SQLServer,
                NodesJson,
                DatabaseInfo);

            var sql = query.GetSql("2");

            Assert.True(sql.Contains("ORDER BY Column_1 DESC,Column_0 ASC"), "SQL Value was: " + sql);
        }
    }
}