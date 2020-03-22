import {
  initializeBlock,
  useBase,
  TablePickerSynced,
  useRecords,
  useGlobalConfig,
  FormField,
  FieldPickerSynced,
  Box,
  Text,
  colors
} from "@airtable/blocks/ui";
import { Pie } from "react-chartjs-2";
import React from "react";
import Field from "@airtable/blocks/dist/types/src/models/field";
import Record from "@airtable/blocks/dist/types/src/models/record";

/**
 * returns an object that maps `groupFieldValues` => `set(chartFieldValues)`. Most sets will just have a single entry
 */
const groupRecordsWithValues = (
  records: Record[],
  groupField: Field,
  chartField: Field
): { [x: string]: Set<string> } =>
  records.reduce(
    (result: ReturnType<typeof groupRecordsWithValues>, record) => {
      const groupByValue = record.getCellValueAsString(groupField);
      // skip records that don't have a group value
      if (!groupByValue) {
        return result;
      }
      const chartValue = record.getCellValueAsString(chartField);
      const values = result[groupByValue] || new Set();
      values.add(chartValue || "none");
      return {
        ...result,
        [groupByValue]: values
      };
    },
    {}
  );

/**
 * returns an object that maps `chartFieldValue` => `count`. Counts each grouped record at most once
 */
const countGroupedValues = (
  groupedRecords: ReturnType<typeof groupRecordsWithValues>
): { [x: string]: number } =>
  Object.entries(groupedRecords).reduce(
    (totals: ReturnType<typeof countGroupedValues>, [, valuesSet]) => {
      const key =
        valuesSet.size > 1 ? "multi" : valuesSet.values().next().value;
      return { ...totals, [key]: (totals[key] || 0) + 1 };
    },
    {}
  );

/**
 * builds the expected data format for the pie chart. See [here](https://github.com/jerairrest/react-chartjs-2/blob/73a47d1d748df986ba8f96f4afe3cc7d4d09a7e3/example/src/components/pie.js).
 */
const formatDataForChart = (
  piePortions: ReturnType<typeof countGroupedValues>
) =>
  Object.keys(piePortions)
    .sort() // assumes stringy values
    .reduce(
      (result, label) => {
        result.labels.push(label);
        result.datasets[0].data.push(piePortions[label]);
        return result;
      },
      {
        labels: [],
        datasets: [
          {
            data: [],
            // as many as needed will be used; if there are more categories, then they'll be grey
            backgroundColor: [
              colors.BLUE,
              colors.ORANGE,
              colors.PURPLE,
              colors.GREEN,
              colors.CYAN,
              colors.YELLOW,
              colors.TEAL,
              colors.RED
            ]
          }
        ]
      } as {
        labels: string[];
        datasets: [{ data: number[]; backgroundColor: string[] }];
      }
    );

const GlobalConfigKeys = {
  TABLE_ID: "tableId",
  GROUPING_FIELD_ID: "groupingField",
  CHART_FIELD_ID: "chartFieldId"
};

function HelloWorldTypescriptBlock() {
  const base = useBase();
  const globalConfig = useGlobalConfig();

  const tableId = (globalConfig.get(GlobalConfigKeys.TABLE_ID) || "") as string;
  const table = base.getTableByIdIfExists(tableId);

  const gropuingField =
    table &&
    table.getFieldByIdIfExists(
      globalConfig.get(GlobalConfigKeys.GROUPING_FIELD_ID) as string
    );
  const chartField =
    table &&
    table.getFieldByIdIfExists(
      globalConfig.get(GlobalConfigKeys.CHART_FIELD_ID) as string
    );

  const records = useRecords(table!, {
    fields: [gropuingField, chartField]
  }) as Record[] | undefined;

  let chartData;
  if (records?.length && gropuingField && chartField) {
    const groupedRecords = groupRecordsWithValues(
      records,
      gropuingField!,
      chartField!
    );
    const piePortions = countGroupedValues(groupedRecords);
    chartData = formatDataForChart(piePortions);
  }

  return (
    <Box>
      <Box display="flex" padding={2} borderBottom="thick">
        <FormField
          label="Table"
          width="33.33%"
          paddingRight={1}
          marginBottom={0}
        >
          <TablePickerSynced globalConfigKey={GlobalConfigKeys.TABLE_ID} />
        </FormField>
        {table && (
          <FormField
            label="Grouping Field"
            width="33.33%"
            paddingX={1}
            marginBottom={0}
          >
            <FieldPickerSynced
              table={table}
              globalConfigKey={GlobalConfigKeys.GROUPING_FIELD_ID}
            />
          </FormField>
        )}
        {table && (
          <FormField
            label="Count Field"
            width="33.33%"
            paddingLeft={1}
            marginBottom={0}
          >
            <FieldPickerSynced
              table={table}
              disabled={!globalConfig.get(GlobalConfigKeys.GROUPING_FIELD_ID)}
              globalConfigKey={GlobalConfigKeys.CHART_FIELD_ID}
            />
          </FormField>
        )}
      </Box>
      <Box>
        {gropuingField && chartField ? (
          <Pie data={chartData}></Pie>
        ) : (
          <Text>Select a Table, Grouping field, and Count field above.</Text>
        )}
      </Box>
    </Box>
  );
}

initializeBlock(() => <HelloWorldTypescriptBlock />);
