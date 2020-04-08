using System;
using System.Collections.Generic;

namespace QueryTree.Engine
{
    public enum FilterOperator 
    {
        EqualTo,
        DoesNotEqual,
        GreaterThan,
        GreaterThanOrEqualTo,
        LessThan,
        LessThanOrEqualTo,
        StartsWith,
        EndsWith,
        Contains,
        DoesNotContain,
        IsEmpty,
        IsNotEmpty,
        Last24Hours,
        Next24Hours,
        Last7Days,
        Next7Days,
        ThisMonth,
        NextMonth,
        LastMonth,
        Last90Days,
        Next90Days,
        LastNDays,
        NextNDays
    }

    public class FilterNode : DataProcessorNode
    {
        public int? FilterColumnIndex { get; set; }
        public FilterOperator Operator { get; set; }
        public int? FilterCompareColumnIndex { get; set; }
        public string FilterValue1 { get; set; }
        public bool CaseSensitive { get; set; }

        public override void UpdateSettings(Dictionary<string, object> settings)
        {
            base.UpdateSettings(settings);

            if (settings.ContainsKey("FilterColumnIndex"))
                FilterColumnIndex = Convert.ToInt32(settings["FilterColumnIndex"]);

            if (settings.ContainsKey("Operator"))
                Operator = (FilterOperator)Enum.Parse(typeof(FilterOperator), (string)settings["Operator"]);

            if (settings.ContainsKey("FilterCompareColumnIndex") && settings["FilterCompareColumnIndex"] != null && !String.IsNullOrWhiteSpace(settings["FilterCompareColumnIndex"].ToString()))
                FilterCompareColumnIndex = Convert.ToInt32(settings["FilterCompareColumnIndex"]);

            if (settings.ContainsKey("FilterValue1"))
                FilterValue1 = settings["FilterValue1"].ToString();
            else
                FilterValue1 = null;

            if (settings.ContainsKey("CaseSensitive"))
                CaseSensitive = (bool)settings["CaseSensitive"];
            else
                CaseSensitive = false;
        }

        public override bool IsConfigured()
        {
            var columns = GetColumns();
            return FilterColumnIndex.HasValue &&
               Inputs.Count > 0 &&
               (FilterCompareColumnIndex.HasValue ||
                FilterValue1 != null) &&
               columns.Count > 0;
        }

        public override string GetQuerySql()
        {
            if (Inputs.Count > 0)
            {
                var firstInput = InputDict[Inputs[0]];

                var columnTypes = GetColumnTypes();

                var sql = string.Format("SELECT * FROM {0} WHERE ", firstInput.GetDependencySql());

                if (DatabaseType == DatabaseType.MySQL)
                    if (CaseSensitive)
                        sql += "BINARY ";

                string compareValue;
                int days = 0;

                var filterColumnSpecifier = string.Format("{0}.Column_{1:D} ",
                                                          firstInput.GetNodeAlias(),
                                                          FilterColumnIndex);
                switch (Operator)
                {
                    case FilterOperator.ThisMonth:
                        if (DatabaseType == DatabaseType.PostgreSQL)
                        {
                            sql += string.Format("(EXTRACT(MONTH FROM {0}) + 12 * EXTRACT(YEAR FROM {0})) - (EXTRACT(MONTH FROM NOW()) + 12 * EXTRACT(YEAR FROM NOW())) = 0", filterColumnSpecifier);
                        }
                        else if (DatabaseType == DatabaseType.MySQL)
                        {
                            sql += string.Format("(MONTH({0}) + 12 * YEAR({0})) - (MONTH(NOW()) + 12 * YEAR(NOW())) = 0", filterColumnSpecifier);
                        }
                        else
                        {
                            sql += string.Format("(MONTH({0}) + 12 * YEAR({0})) - (MONTH(GETDATE()) + 12 * YEAR(GETDATE())) = 0", filterColumnSpecifier);
                        }

                        break;
                    case FilterOperator.NextMonth:
                        if (DatabaseType == DatabaseType.PostgreSQL)
                        {
                            sql += string.Format("(EXTRACT(MONTH FROM {0}) + 12 * EXTRACT(YEAR FROM {0})) - (EXTRACT(MONTH FROM NOW()) + 12 * EXTRACT(YEAR FROM NOW())) = 1", filterColumnSpecifier);
                        }
                        else if (DatabaseType == DatabaseType.MySQL)
                        {
                            sql += string.Format("(MONTH({0}) + 12 * YEAR({0})) - (MONTH(NOW()) + 12 * YEAR(NOW())) = 1", filterColumnSpecifier);
                        }
                        else
                        {
                            sql += string.Format("(MONTH({0}) + 12 * YEAR({0})) - (MONTH(GETDATE()) + 12 * YEAR(GETDATE())) = 1", filterColumnSpecifier);
                        }

                        break;
                    case FilterOperator.LastMonth:
                        if (DatabaseType == DatabaseType.PostgreSQL)
                        {
                            sql += string.Format("(EXTRACT(MONTH FROM {0}) + 12 * EXTRACT(YEAR FROM {0})) - (EXTRACT(MONTH FROM NOW()) + 12 * EXTRACT(YEAR FROM NOW())) = -1", filterColumnSpecifier);
                        }
                        else if (DatabaseType == DatabaseType.MySQL)
                        {
                            sql += string.Format("(MONTH({0}) + 12 * YEAR({0})) - (MONTH(NOW()) + 12 * YEAR(NOW())) = -1", filterColumnSpecifier);
                        }
                        else
                        {
                            sql += string.Format("(MONTH({0}) + 12 * YEAR({0})) - (MONTH(GETDATE()) + 12 * YEAR(GETDATE())) = -1", filterColumnSpecifier);
                        }

                        break;
                    case FilterOperator.Last24Hours:
                        switch (DatabaseType)
                        {
                            case DatabaseType.SQLServer:
                                sql += string.Format("DATEDIFF(h, GETDATE(), {0}) BETWEEN -24 AND 0", filterColumnSpecifier);
                                break;
                            case DatabaseType.PostgreSQL:
                                sql += string.Format("(DATE_PART('day', NOW() - {0}::timestamp) * 24 + DATE_PART('hour', NOW() - {0}::timestamp)) BETWEEN -24 AND 0", filterColumnSpecifier);
                                break;
                            case DatabaseType.MySQL:
                                sql += string.Format("TIMESTAMPDIFF(HOUR, NOW(), {0}) BETWEEN -24 AND 0", filterColumnSpecifier);
                                break;
                        }
                        break;

                    case FilterOperator.Next24Hours:
                        switch (DatabaseType)
                        {
                            case DatabaseType.SQLServer:
                                sql += string.Format("DATEDIFF(d, GETDATE(), {0}) BETWEEN -90 AND -1", filterColumnSpecifier);
                                break;
                            case DatabaseType.PostgreSQL:
                                sql += string.Format("{0}::date - NOW()::date BETWEEN -90 AND -1", filterColumnSpecifier);
                                break;
                            case DatabaseType.MySQL:
                                sql += string.Format("DATEDIFF(NOW(), {0}) BETWEEN -90 AND -1", filterColumnSpecifier);
                                break;
                        }
                        break;

                    case FilterOperator.Last7Days:
                        switch (DatabaseType)
                        {
                            case DatabaseType.SQLServer:
                                sql += string.Format("DATEDIFF(d, GETDATE(), {0}) BETWEEN -7 AND -1", filterColumnSpecifier);
                                break;
                            case DatabaseType.PostgreSQL:
                                sql += string.Format("{0}::date - NOW()::date BETWEEN -7 AND -1", filterColumnSpecifier);
                                break;
                            case DatabaseType.MySQL:
                                sql += string.Format("DATEDIFF(NOW(), {0}) BETWEEN -7 AND -1", filterColumnSpecifier);
                                break;
                        }
                        break;

                    case FilterOperator.Next7Days:
                        switch (DatabaseType)
                        {
                            case DatabaseType.SQLServer:
                                sql += string.Format("DATEDIFF(d, GETDATE(), {0}) BETWEEN 0 AND 6", filterColumnSpecifier);
                                break;
                            case DatabaseType.PostgreSQL:
                                sql += string.Format("{0}::date - NOW()::date BETWEEN 0 AND 6", filterColumnSpecifier);
                                break;
                            case DatabaseType.MySQL:
                                sql += string.Format("DATEDIFF(NOW(), {0}) BETWEEN 0 AND 6", filterColumnSpecifier);
                                break;
                        }
                        break;
                    case FilterOperator.Last90Days:
                        switch (DatabaseType)
                        {
                            case DatabaseType.SQLServer:
                                sql += string.Format("DATEDIFF(d, GETDATE(), {0}) BETWEEN -90 AND -1", filterColumnSpecifier);
                                break;
                            case DatabaseType.PostgreSQL:
                                sql += string.Format("{0}::date - NOW()::date BETWEEN -90 AND -1", filterColumnSpecifier);
                                break;
                            case DatabaseType.MySQL:
                                sql += string.Format("DATEDIFF({0}, NOW()) BETWEEN -90 AND -1", filterColumnSpecifier);
                                break;
                        }

                        break;
                    case FilterOperator.Next90Days:
                        switch (DatabaseType)
                        {
                            case DatabaseType.SQLServer:
                                sql += string.Format("DATEDIFF(d, GETDATE(), {0}) BETWEEN 0 AND 89", filterColumnSpecifier);
                                break;
                            case DatabaseType.PostgreSQL:
                                sql += string.Format("{0}::date - NOW()::date BETWEEN 0 AND 89", filterColumnSpecifier);
                                break;
                            case DatabaseType.MySQL:
                                sql += string.Format("DATEDIFF({0}, NOW()) BETWEEN 0 AND 89", filterColumnSpecifier);
                                break;
                        }

                        break;
                    case FilterOperator.LastNDays:
                        if (int.TryParse(FilterValue1, out days))
                        {
                            switch (DatabaseType)
                            {
                                case DatabaseType.SQLServer:
                                    sql += $"DATEDIFF(d, GETDATE(), {filterColumnSpecifier}) BETWEEN -{days} AND -1";
                                    break;
                                case DatabaseType.PostgreSQL:
                                    sql += $"{filterColumnSpecifier}::date - NOW()::date BETWEEN -{days} AND -1";
                                    break;
                                case DatabaseType.MySQL:
                                    sql += $"DATEDIFF({filterColumnSpecifier}, NOW()) BETWEEN -{days} AND -1";
                                    break;
                            }
                        }
                        break;
                    case FilterOperator.NextNDays:
                        if (int.TryParse(FilterValue1, out days))
                        {
                            switch (DatabaseType)
                            {
                                case DatabaseType.SQLServer:
                                    sql += $"DATEDIFF(d, GETDATE(), {filterColumnSpecifier}) BETWEEN 0 AND {days-1}";
                                    break;
                                case DatabaseType.PostgreSQL:
                                    sql += $"{filterColumnSpecifier}::date - NOW()::date BETWEEN 0 AND {days-1}";
                                    break;
                                case DatabaseType.MySQL:
                                    sql += $"DATEDIFF({filterColumnSpecifier}, NOW()) BETWEEN 0 AND {days-1}";
                                    break;
                            }
                        }
                        break;
                    default:
                        if (DatabaseType == DatabaseType.PostgreSQL && IsTextType(columnTypes[FilterColumnIndex.Value]) && !CaseSensitive && (Operator == FilterOperator.EqualTo || Operator == FilterOperator.DoesNotEqual))
                        {
                            sql += string.Format("LOWER({0})", filterColumnSpecifier);
                        }
                        else
                        {
                            sql += filterColumnSpecifier;
                        }

                        if (DatabaseType == DatabaseType.SQLServer
                                && IsQuotedType(columnTypes[FilterColumnIndex.Value])
                                && !IsDateType(columnTypes[FilterColumnIndex.Value]))
                        {
                            if (CaseSensitive)
                            {
                                sql += "COLLATE Latin1_General_CS_AS ";
                            }
                            else
                            {
                                sql += "COLLATE Latin1_General_CI_AS ";
                            }
                        }

                        if (Operator != FilterOperator.IsEmpty && Operator != FilterOperator.IsNotEmpty)
                        {
                            if (FilterCompareColumnIndex == null)
                            {
                                compareValue = FilterValue1;
                                switch (Operator)
                                {
                                    case FilterOperator.StartsWith:
                                        compareValue += "%";
                                        break;
                                    case FilterOperator.Contains:
                                    case FilterOperator.DoesNotContain:
                                        compareValue = "%" + compareValue + "%";
                                        break;
                                    case FilterOperator.EndsWith:
                                        compareValue = "%" + compareValue;
                                        break;
                                }
                            }
                            else
                            {
                                compareValue = string.Format("{0}.Column_{1:D}", firstInput.GetNodeAlias(), FilterCompareColumnIndex);
                                switch (Operator)
                                {
                                    case FilterOperator.StartsWith:
                                        compareValue = string.Format("CONCAT({0},'%')", compareValue);
                                        break;
                                    case FilterOperator.Contains:
                                    case FilterOperator.DoesNotContain:
                                        compareValue = string.Format("CONCAT('%',{0},'%')", compareValue);
                                        break;
                                    case FilterOperator.EndsWith:
                                        compareValue = string.Format("CONCAT('%',{0})", compareValue);
                                        break;
                                }
                            }

                            if (compareValue != null)
                                compareValue = compareValue.Replace("\'", "\'\'");

                            if (FilterCompareColumnIndex == null)
                            {
                                if (IsQuotedType(columnTypes[FilterColumnIndex.Value]))
                                {
                                    compareValue = "\'" + compareValue + "\'";
                                }

                                if (DatabaseType == DatabaseType.PostgreSQL && IsTextType(columnTypes[FilterColumnIndex.Value]) && !CaseSensitive)
                                {
                                    compareValue = "LOWER(" + compareValue + ")";
                                }
                                
                                if (DatabaseType == DatabaseType.PostgreSQL && IsBoolType(columnTypes[FilterColumnIndex.Value]))
                                {
                                    compareValue = (new List<string>() { "1", "YES", "TRUE" }).Contains(compareValue.ToUpper()) ? "TRUE" : "FALSE";
                                }
                            }
                                
                            switch (Operator)
                            {
                                case FilterOperator.EqualTo:
                                    sql += string.Format("= {0}", compareValue);
                                    break;
                                case FilterOperator.DoesNotEqual:
                                    sql += string.Format("<> {0}", compareValue);
                                    break;
                                case FilterOperator.GreaterThanOrEqualTo:
                                    sql += string.Format(">= {0}", compareValue);
                                    break;
                                case FilterOperator.GreaterThan:
                                    sql += string.Format("> {0}", compareValue);
                                    break;
                                case FilterOperator.LessThanOrEqualTo:
                                    sql += string.Format("<= {0}", compareValue);
                                    break;
                                case FilterOperator.LessThan:
                                    sql += string.Format("< {0}", compareValue);
                                    break;
                                case FilterOperator.StartsWith:
                                    if (DatabaseType == DatabaseType.PostgreSQL && !CaseSensitive)
                                    {
                                        sql += string.Format("ILIKE {0}", compareValue);
                                    }
                                    else
                                    {
                                        sql += string.Format("LIKE {0}", compareValue);
                                    }

                                    break;
                                case FilterOperator.Contains:
                                    if (DatabaseType == DatabaseType.PostgreSQL && !CaseSensitive)
                                    {
                                        sql += string.Format("ILIKE {0}", compareValue);
                                    }
                                    else
                                    {
                                        sql += string.Format("LIKE {0}", compareValue);
                                    }

                                    break;
                                case FilterOperator.DoesNotContain:
                                    if (DatabaseType == DatabaseType.PostgreSQL && !CaseSensitive)
                                    {
                                        sql += string.Format("NOT ILIKE {0}", compareValue);
                                    }
                                    else
                                    {
                                        sql += string.Format("NOT LIKE {0}", compareValue);
                                    }

                                    break;
                                case FilterOperator.EndsWith:
                                    if (DatabaseType == DatabaseType.PostgreSQL && !CaseSensitive)
                                    {
                                        sql += string.Format("ILIKE {0}", compareValue);
                                    }
                                    else
                                    {
                                        sql += string.Format("LIKE {0}", compareValue);
                                    }

                                    break;
                            }
                        }
                        else if (Operator == FilterOperator.IsEmpty)
                        {
                            sql += "IS NULL";
                        }
                        else if (Operator == FilterOperator.IsNotEmpty)
                        {
                            sql += "IS NOT NULL";
                        }

                        break;
                }

                return sql;
            }
            else
                return "SELECT NULL";
        }
	}
}
