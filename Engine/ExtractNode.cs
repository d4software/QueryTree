using System;
using System.Collections.Generic;
using System.Linq;

namespace QueryTree.Engine
{
    public enum ExtractStartTypes
    {
        TheBeginning = 1,
        SpecificPosition,
        OnFirstOccurrenceOf,
        AfterFirstOccurrenceOf
    }

    public enum ExtractEndTypes
    {
        TheEnd = 1,
        SpecificPosition,
        SpecificLength,
        OnNextOccurrenceOf,
        AfterNextOccurrenceOf
    }

    public class ExtractNode : DataProcessorNode
    {
        private int InputColumnIndex;
        private ExtractStartTypes StartType;
        private int StartPosition;
        private string StartSearch;
        private ExtractEndTypes EndType;
        private int EndPosition;
        private string EndSearch;
        private string ResultColumnName;

        private string DatabaseLengthFunction()
        {
            if (DatabaseType == DatabaseType.SQLServer)
            {
                return "LEN";
            }
            else
            {
                return "LENGTH";
            }		        
        }

        public override bool IsConfigured()
        {
            return Inputs.Any() && !String.IsNullOrWhiteSpace(ResultColumnName);
        }

        public override void UpdateSettings(Dictionary<string, object> settings)
        {
            base.UpdateSettings(settings);
            
            if (settings.ContainsKey("InputColumnIndex"))
            {
                InputColumnIndex = Convert.ToInt32(settings["InputColumnIndex"]);
            }

            if (settings.ContainsKey("StartType"))
            {
                StartType = (ExtractStartTypes)Enum.Parse(typeof(ExtractStartTypes), settings["StartType"].ToString());
            }
            
            if (settings.ContainsKey("StartPosition"))
            {
                StartPosition = Convert.ToInt32(settings["StartPosition"]);
            }

            if (settings.ContainsKey("StartSearch"))
            {
                StartSearch = (string)settings["StartSearch"];
            }

            if (settings.ContainsKey("EndType"))
            {
                EndType = (ExtractEndTypes)Enum.Parse(typeof(ExtractEndTypes), settings["EndType"].ToString());
            }

            if (settings.ContainsKey("EndPosition"))
            {
                EndPosition = Convert.ToInt32(settings["EndPosition"]);
            }

            if (settings.ContainsKey("EndSearch"))
            {
                EndSearch = (string)settings["EndSearch"];
            }

            if (settings.ContainsKey("ResultColumnName"))
            {
                ResultColumnName = (string)settings["ResultColumnName"];
            }
        }
 
        public override IList<string> GetColumns()
        {
            var baseCols = new List<string>();
            baseCols.AddRange(base.GetColumns().Select(c => c)); // Copy values
            baseCols.Add(ResultColumnName);
            return baseCols;
        }

        public override IList<string> GetColumnTypes()
        {
            if (InputDict.Any())
            {
                var input1 = InputDict[Inputs[0]];
                var input1ColTypes = input1.GetColumnTypes();
                var newColType = "VARCHAR";

                if (!IsDateType(input1ColTypes[InputColumnIndex]))
                {
                    newColType = input1ColTypes[InputColumnIndex];
                }

                var baseColTypes = new List<string>();
                baseColTypes.AddRange(input1ColTypes.Select(ct => ct));  // Copy values
				baseColTypes.Add(newColType);
                return baseColTypes;
            }
            return new List<string>();
        }

        public override string GetQuerySql()
        {
            var input1 = InputDict[Inputs[0]];
            var input1ColTypes = input1.GetColumnTypes();
            var columnSpecifier = string.Format("Column_{0:D}", InputColumnIndex);

            if (DatabaseType == DatabaseType.SQLServer)
            {
                // On SQLServer we must convert dates to text before we can extract from them
                if (IsDateType(input1ColTypes[InputColumnIndex]))
                {
                    columnSpecifier = string.Format("CONVERT(VARCHAR(30), {0}, 20)", columnSpecifier);
                }
                else if (!IsQuotedType(input1ColTypes[InputColumnIndex]))
                {
                    columnSpecifier = string.Format("CAST({0} AS VARCHAR(MAX))", columnSpecifier);
                }
                else if (DatabaseType == DatabaseType.PostgreSQL && !IsQuotedType(input1ColTypes[InputColumnIndex]))
                {
                    columnSpecifier = string.Format("cast({0} as text)", columnSpecifier);
                }
                else if (DatabaseType == DatabaseType.MySQL && IsQuotedType(input1ColTypes[InputColumnIndex]))
                {
                    columnSpecifier = string.Format("CAST({0} as CHAR)", columnSpecifier);
                }
            }

            var newColumnDefinition = columnSpecifier;

            if (StartType != ExtractStartTypes.TheBeginning || EndType != ExtractEndTypes.TheEnd)
            {
                var locateFunc = "LOCATE";

                if (DatabaseType == DatabaseType.SQLServer)
                {
                    locateFunc = "CHARINDEX";
                }
                else if (DatabaseType == DatabaseType.PostgreSQL)
                {
                    locateFunc = "POSITION";
                }

                var startClause = "1"; // Assume ExtractStartTypes.TheBeginning
                switch (StartType)
                {
                    case ExtractStartTypes.SpecificPosition:
                        startClause = string.Format("{0:D}", StartPosition);
                        break;
                    case ExtractStartTypes.OnFirstOccurrenceOf:
                        if (DatabaseType == DatabaseType.PostgreSQL)
                        {
                            startClause = string.Format("{0}('{1}' IN {2})",
                                locateFunc,
                                StartSearch.Replace("'", "''"),
                                columnSpecifier);
                        }
                        else
                        {
                            startClause = string.Format("{0}('{1}', {2})",
                                locateFunc,
                                StartSearch.Replace("'", "''"),
                                columnSpecifier);
                        }

                        break;
                    case ExtractStartTypes.AfterFirstOccurrenceOf:
                        if (DatabaseType == DatabaseType.PostgreSQL)
                        {
                            startClause = string.Format("{0}('{1}' IN {2}) + {3:D}",
                                locateFunc,
                                StartSearch.Replace("'", "''"),
                                columnSpecifier,
                                StartSearch.Length);
                        }
                        else
                        {
                            startClause = string.Format("{0}('{1}', {2}) + {3:D}",
                                locateFunc,
                                StartSearch.Replace("'", "''"),
                                columnSpecifier,
                                StartSearch.Length);
                        }

                        break;
                }

                // Assume ExtractEndTypes.TheEnd
                var endClause = string.Format("{0}({1}) - ({2} - 1)",
                        DatabaseLengthFunction(),
                        columnSpecifier,
                        startClause);
                switch (EndType)
                {
                    case ExtractEndTypes.SpecificPosition:
                        endClause = string.Format("{0:D} - {1}",
							EndPosition,
							startClause);
                        break;
                    case ExtractEndTypes.SpecificLength:
                        endClause = string.Format("{0:D}",
                            EndPosition);
                        break;
                    case ExtractEndTypes.OnNextOccurrenceOf:
                        if (DatabaseType == DatabaseType.PostgreSQL)
                        {
                            endClause = string.Format("{0}('{1}' IN SUBSTRING({2} FROM {3})) - ({3})",
                                locateFunc,
                                EndSearch.Replace("'", "''"),
                                columnSpecifier,
                                startClause);
                        }
                        else
                        {
                            endClause = string.Format("{0}('{1}', {2}, {3}) - ({3})",
                                locateFunc,
                                EndSearch.Replace("'", "''"),
                                columnSpecifier,
                                startClause);
                        }

                        break;
                    case ExtractEndTypes.AfterNextOccurrenceOf:
                        if (DatabaseType == DatabaseType.PostgreSQL)
                        {
                            endClause = string.Format("{0}('{1}' IN SUBSTRING({2} FROM {3})) + {4:D} - ({5})",
                                locateFunc,
                                EndSearch.Replace("'", "''"),
                                columnSpecifier,
                                startClause,
                                EndSearch.Length,
                                startClause);
                        }
                        else
                        {
                            endClause = string.Format("{0}('{1}', {2}, {3}) + {4:D} - ({5})",
                                locateFunc,
                                EndSearch.Replace("'", "''"),
                                columnSpecifier,
                                startClause,
                                EndSearch.Length,
                                startClause);
                        }

                        break;
                }

                newColumnDefinition = string.Format("SUBSTRING({0}, {1}, {2})",
                    columnSpecifier,
                    startClause,
                    endClause);
            }

            var sql = string.Format("SELECT *, {0} AS Column_{1:D} FROM {2} ",
                newColumnDefinition,
                GetColumns().Count - 1,
                input1.GetDependencySql());
            
            return sql;
        }
    }
}
