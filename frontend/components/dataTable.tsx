import {
  type ButtonProps,
  chakra,
  createListCollection,
  Flex,
  Grid,
  GridItem,
  HStack,
  IconButton,
  Spacer,
  Table,
  Text,
} from "@chakra-ui/react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type HeaderContext,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import type { InitialTableState } from "@tanstack/table-core";
import type { ValueChangeDetails } from "@zag-js/select";
import type React from "react";
import { Fragment, useState } from "react";
import {
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "@/components/ui/select";
import { MappedIcon } from "./mappedIcon";
import { NumberInputField, NumberInputRoot } from "./ui/number-input";
import { Tooltip } from "./ui/tooltip";

export type Column = ColumnDef<any>;

interface ColumnMeta {
  cellProps?: React.ComponentProps<typeof Table.Cell>;
  headerProps?: React.ComponentProps<typeof Table.ColumnHeader>;
}

const columnMeta = (column: ColumnDef<any>): ColumnMeta =>
  (column.meta as ColumnMeta | undefined) ?? {};

export interface DataTableProps {
  columns: Column[];
  data: any[];
  globalFilter?: string;
  paginate?: boolean;
  initialState?: InitialTableState;
}

export const DataTable = (props: DataTableProps) => {
  const { columns, data, paginate = true, initialState, globalFilter } = props;

  const [sorting, setSorting] = useState<SortingState>(
    initialState?.sorting || [],
  );

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
    colorPalette: "blue",
    variant: "outline",
  };

  const paginationPages = createListCollection({
    items: [10, 20, 30, 40, 50].map((item) => ({
      label: `Show ${item}`,
      value: item,
    })),
  });

  return (
    <>
      {table.getRowModel().rows.map((row, rowIndex) => (
        <Grid
          hideFrom={"xl"}
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
                  <GridItem minW={0}>
                    <Text as={"h3"} letterSpacing={"wider"}>
                      {" "}
                      {label}:
                    </Text>
                  </GridItem>
                )}
                <GridItem minW={0}>
                  <Text as={!label && rowIndex === 0 ? "h2" : "span"}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Text>
                </GridItem>
              </Fragment>
            );
          })}
        </Grid>
      ))}
      <Table.Root hideBelow={"xl"} bg="inherit">
        <Table.Header>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id} bg="inherit">
              {headerGroup.headers.map((header) => {
                const { headerProps } = columnMeta(header.column.columnDef);

                return (
                  <Table.ColumnHeader
                    pl={0}
                    textTransform={"revert"}
                    key={header.id}
                    colSpan={header.colSpan}
                    cursor={header.column.getCanSort() ? "pointer" : "none"}
                    onClick={header.column.getToggleSortingHandler()}
                    {...headerProps}
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
                              <MappedIcon
                                icon={"triangle-up"}
                                aria-label="sorted ascending"
                              />
                            ),
                            desc: (
                              <MappedIcon
                                icon={"triangle-down"}
                                aria-label="sorted descending"
                              />
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
                  </Table.ColumnHeader>
                );
              })}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body>
          {table.getRowModel().rows.map((row) => {
            return (
              <Table.Row key={row.id} bg="inherit">
                {row.getVisibleCells().map((cell) => {
                  const { cellProps } = columnMeta(cell.column.columnDef);

                  return (
                    <Table.Cell pl={0} key={cell.id} {...cellProps}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </Table.Cell>
                  );
                })}
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>

      {paginate && (
        <HStack wrap={"wrap"} justify={"space-between"} width={"100%"}>
          <Flex align={"flex-start"}>
            <Flex>
              <Tooltip content="First Page">
                <IconButton
                  aria-label={"First Page"}
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  mr={2}
                  {...paginateButtonsProps}
                >
                  <MappedIcon icon={"double-arrow-left"} h={6} w={6} />
                </IconButton>
              </Tooltip>
              <Tooltip content="Previous Page">
                <IconButton
                  aria-label={"Previous Page"}
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  {...paginateButtonsProps}
                >
                  <MappedIcon icon={"chevron-left"} h={4} w={4} />
                </IconButton>
              </Tooltip>
            </Flex>
          </Flex>
          <Flex align={"flex-start"}>
            <Flex alignItems="center" flexWrap={"wrap"} gap={2} rowGap={2}>
              <Text flexShrink="0">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </Text>
              <Text flexShrink="0">Go to page:</Text>{" "}
              <NumberInputRoot
                w={20}
                min={1}
                max={table.getPageCount()}
                onValueChange={(e: { value: any }) => {
                  const page = e.value ? parseInt(e.value, 10) - 1 : 0;
                  table.setPageIndex(page);
                }}
                defaultValue={String(table.getState().pagination.pageIndex + 1)}
              >
                <NumberInputField />
              </NumberInputRoot>
              <SelectRoot
                w={32}
                variant={"outline"}
                collection={paginationPages}
                value={[String(table.getState().pagination.pageSize)]}
                onValueChange={(e: ValueChangeDetails) => {
                  table.setPageSize(Number(e.value));
                }}
              >
                <SelectLabel>
                  <SelectTrigger>
                    <SelectValueText placeholder="Select" />
                  </SelectTrigger>
                </SelectLabel>
                <SelectContent>
                  {paginationPages.items.map((page: any) => (
                    <SelectItem key={page.value} item={page}>
                      {page.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </Flex>
          </Flex>
          <Flex align={"flex-start"}>
            <Flex>
              <Tooltip content="Next Page">
                <IconButton
                  aria-label={"Next Page"}
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  {...paginateButtonsProps}
                >
                  <MappedIcon icon={"chevron-right"} h={4} w={4} />
                </IconButton>
              </Tooltip>
              <Tooltip content="Last Page">
                <IconButton
                  aria-label={"Last Page"}
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  ml={2}
                  {...paginateButtonsProps}
                >
                  <MappedIcon icon={"double-arrow-right"} h={6} w={6} />
                </IconButton>
              </Tooltip>
            </Flex>
          </Flex>
        </HStack>
      )}
    </>
  );
};

export default DataTable;
