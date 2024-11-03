import {
  ButtonProps,
  chakra,
  Flex,
  Grid,
  GridItem,
  Hide,
  IconButton,
  IconButtonProps,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  Show,
  Spacer,
  Table,
  TableCellProps,
  TableColumnHeaderProps,
  TableContainerProps,
  TableProps,
  TableRowProps,
  Tbody,
  Td,
  Text,
  TextProps,
  Th,
  Thead,
  ThemingProps,
  Tooltip,
  Tr,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TriangleDownIcon,
  TriangleUpIcon,
} from "@chakra-ui/icons";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  HeaderContext,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Fragment, useState } from "react";
import { InitialTableState } from "@tanstack/table-core";

export type Column = ColumnDef<any> & {
  tableColumnHeaderProps?: TableColumnHeaderProps;
  tableCellProps?: TableCellProps;
};

export interface DataTableProps {
  columns: Column[];
  data: any[];
  globalFilter?: string;
  paginate?: boolean;
  tableProps?: TableProps;
  tableRowProps?: TableRowProps;
  iconButtonProps?: Partial<IconButtonProps>;
  tableContainerProps?: TableContainerProps;
  textProps?: TextProps;
  inputProps?: ThemingProps;
  initialState?: InitialTableState;
}

export const DataTable = (props: DataTableProps) => {
  const {
    columns,
    data,
    paginate = true,
    initialState,
    globalFilter,
    tableProps = {},
    iconButtonProps = {},
    textProps = {},
    inputProps = {},
  } = props;

  const [sorting, setSorting] = useState<SortingState>(
    initialState?.sorting || [],
  );
  const { variant: inputVariant } = inputProps;

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: paginate ? getPaginationRowModel() : undefined,
    initialState,
    autoResetPageIndex: false,
    debugTable: false,
  });

  const paginateButtonsProps: ButtonProps = {
    colorScheme: "blue",
    variant: "outline",
  };

  return (
    <>
      <Show below={"xl"}>
        {table.getRowModel().rows.map((row, rowIndex) => (
          <Grid
            templateColumns="repeat(2, 1fr)"
            key={rowIndex}
            gap={4}
            borderBottomWidth={1}
            padding={2}
            mb={4}
            pb={4}
            overflow={"hidden"}
          >
            {row.getVisibleCells().map((cell) => {
              const label = flexRender(
                cell.column.columnDef.header,
                cell.getContext() as unknown as HeaderContext<any, any>,
              );
              return (
                <Fragment key={cell.id}>
                  {label && (
                    <GridItem>
                      <Text as={"h3"} letterSpacing={"wider"}>
                        {" "}
                        {label}:
                      </Text>
                    </GridItem>
                  )}
                  <GridItem>
                    <Text as={!label && rowIndex === 0 ? "h2" : "span"}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </Text>
                  </GridItem>
                </Fragment>
              );
            })}
          </Grid>
        ))}
      </Show>
      <Hide below={"xl"}>
        <Table {...tableProps}>
          <Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Th
                    pl={0}
                    textTransform={"revert"}
                    key={header.id}
                    colSpan={header.colSpan}
                    cursor={header.column.getCanSort() ? "pointer" : "none"}
                    onClick={header.column.getToggleSortingHandler()}
                    {...(header.column.columnDef as Column)
                      .tableColumnHeaderProps}
                  >
                    {!header.isPlaceholder && header.column.getCanSort() && (
                      <Flex>
                        <chakra.span>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </chakra.span>
                        <Spacer />
                        <chakra.span>
                          {{
                            asc: (
                              <TriangleUpIcon aria-label="sorted ascending" />
                            ),
                            desc: (
                              <TriangleDownIcon aria-label="sorted descending" />
                            ),
                          }[header.column.getIsSorted() as string] ?? null}
                        </chakra.span>
                      </Flex>
                    )}
                    {!header.isPlaceholder &&
                      !header.column.getCanSort() &&
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                  </Th>
                ))}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {table.getRowModel().rows.map((row) => {
              return (
                <Tr key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <Td
                        pl={0}
                        key={cell.id}
                        {...(cell.column.columnDef as Column).tableCellProps}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </Td>
                    );
                  })}
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Hide>

      {paginate && table.getPageCount() > 1 && (
        <Wrap justify={"space-between"} width={"100%"}>
          <WrapItem>
            <Flex>
              <Tooltip label="First Page">
                <IconButton
                  {...iconButtonProps}
                  aria-label={"First Page"}
                  onClick={() => table.setPageIndex(0)}
                  isDisabled={!table.getCanPreviousPage()}
                  icon={<ArrowLeftIcon h={3} w={3} />}
                  mr={2}
                  {...paginateButtonsProps}
                />
              </Tooltip>
              <Tooltip label="Previous Page">
                <IconButton
                  {...iconButtonProps}
                  aria-label={"Previous Page"}
                  onClick={() => table.previousPage()}
                  isDisabled={!table.getCanPreviousPage()}
                  icon={<ChevronLeftIcon h={6} w={6} />}
                  {...paginateButtonsProps}
                />
              </Tooltip>
            </Flex>
          </WrapItem>
          <WrapItem>
            <Flex alignItems="center">
              <Text flexShrink="0" mr={8} {...textProps}>
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </Text>
              <Text flexShrink="0" {...textProps}>
                Go to page:
              </Text>{" "}
              <NumberInput
                ml={2}
                mr={4}
                w={28}
                min={1}
                max={table.getPageCount()}
                onChange={(value) => {
                  const page = value ? parseInt(value) - 1 : 0;
                  table.setPageIndex(page);
                }}
                defaultValue={table.getState().pagination.pageIndex + 1}
                {...inputProps}
              >
                <NumberInputField />
                {inputVariant != "flushed" && inputVariant != "unstyled" && (
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                )}
              </NumberInput>
              <Select
                w={32}
                value={table.getState().pagination.pageSize}
                onChange={(e) => {
                  table.setPageSize(Number(e.target.value));
                }}
                {...inputProps}
              >
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    Show {pageSize}
                  </option>
                ))}
              </Select>
            </Flex>
          </WrapItem>
          <WrapItem>
            <Flex>
              <Tooltip label="Next Page">
                <IconButton
                  {...iconButtonProps}
                  aria-label={"Next Page"}
                  onClick={() => table.nextPage()}
                  isDisabled={!table.getCanNextPage()}
                  icon={<ChevronRightIcon h={6} w={6} />}
                  {...paginateButtonsProps}
                />
              </Tooltip>
              <Tooltip label="Last Page">
                <IconButton
                  {...iconButtonProps}
                  aria-label={"Last Page"}
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  isDisabled={!table.getCanNextPage()}
                  icon={<ArrowRightIcon h={3} w={3} />}
                  ml={2}
                  {...paginateButtonsProps}
                />
              </Tooltip>
            </Flex>
          </WrapItem>
        </Wrap>
      )}
    </>
  );
};

export default DataTable;
