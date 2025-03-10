import React, { useState, useEffect } from 'react';
import { LayoutPanel } from 'fundamental-react';

import { SearchInput } from './SearchInput';
import { Pagination } from './Pagination/Pagination';
import ListActions from '../ListActions/ListActions';
import { Spinner } from '../Spinner/Spinner';
import { HeaderRenderer, RowRenderer, BodyFallback } from './components';

import { filterEntries } from './helpers';
import { MESSAGES } from './constants';
import classnames from 'classnames';

import PropTypes from 'prop-types';
import CustomPropTypes from '../../typechecking/CustomPropTypes';

import { getErrorMessage } from '../..';
import './GenericList.scss';

export const GenericList = ({
  entries = [],
  entriesKind,
  actions,
  title,

  headerRenderer,
  rowRenderer,
  notFoundMessage,
  noSearchResultMessage,
  serverErrorMessage,
  extraHeaderContent,
  showSearchField,
  textSearchProperties,
  showSearchSuggestion,
  showSearchControl,
  actionsStandaloneItems,
  testid,
  showRootHeader,
  showHeader,
  serverDataError,
  serverDataLoading,
  hasExternalMargin,
  pagination,
  compact,
  className,
}) => {
  const [currentPage, setCurrentPage] = React.useState(
    pagination?.initialPage || 1,
  );
  const [filteredEntries, setFilteredEntries] = useState(entries);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (pagination) {
      // move back when the last item from the last page is deleted
      const pagesCount = Math.ceil(entries.length / pagination.itemsPerPage);
      if (currentPage > pagesCount && pagesCount > 0) {
        setCurrentPage(pagesCount);
      }
    }
    setFilteredEntries(
      filterEntries([...entries], searchQuery, textSearchProperties),
    );
  }, [searchQuery, setFilteredEntries, entries]);

  React.useEffect(() => setCurrentPage(1), [searchQuery]);

  const headerActions = (
    <>
      {showSearchField && (
        <SearchInput
          entriesKind={entriesKind || title || ''}
          searchQuery={searchQuery}
          filteredEntries={filteredEntries}
          handleQueryChange={setSearchQuery}
          suggestionProperties={textSearchProperties}
          showSuggestion={showSearchSuggestion}
          showSearchControl={showSearchControl}
          disabled={!entries.length}
        />
      )}
      {extraHeaderContent}
    </>
  );

  const renderTableBody = () => {
    if (serverDataError) {
      return (
        <BodyFallback>
          <p>
            {serverErrorMessage
              ? serverErrorMessage
              : getErrorMessage(serverDataError)}
          </p>
        </BodyFallback>
      );
    }

    if (serverDataLoading) {
      return (
        <BodyFallback>
          <Spinner />
        </BodyFallback>
      );
    }

    if (!filteredEntries.length) {
      if (searchQuery) {
        return (
          <BodyFallback>
            <p>{noSearchResultMessage}</p>
          </BodyFallback>
        );
      }
      return (
        <BodyFallback>
          <p>{notFoundMessage}</p>
        </BodyFallback>
      );
    }

    let pagedItems = filteredEntries;
    if (pagination) {
      pagedItems = filteredEntries.slice(
        (currentPage - 1) * pagination.itemsPerPage,
        currentPage * pagination.itemsPerPage,
      );
    }

    return pagedItems.map((e, index) => (
      <RowRenderer
        key={e.id || e.name || index}
        entry={e}
        actions={actions}
        actionsStandaloneItems={actionsStandaloneItems}
        rowRenderer={rowRenderer}
        compact={compact}
      />
    ));
  };

  const tableClassNames = classnames(
    'fd-table',
    'fd-table--no-horizontal-borders',
    { compact },
  );
  const panelClassNames = classnames(
    'generic-list',
    {
      'fd-margin--md': hasExternalMargin,
    },
    className,
  );

  return (
    <LayoutPanel className={panelClassNames} data-testid={testid}>
      {showRootHeader && (
        <LayoutPanel.Header className="fd-has-padding-left-small fd-has-padding-right-small">
          <LayoutPanel.Head title={title} />
          <LayoutPanel.Actions>{headerActions}</LayoutPanel.Actions>
        </LayoutPanel.Header>
      )}

      <LayoutPanel.Body className="fd-has-padding-none">
        <table className={tableClassNames}>
          {showHeader && (
            <thead className="fd-table__header">
              <tr className="fd-table__row">
                <HeaderRenderer
                  entries={entries}
                  actions={actions}
                  headerRenderer={headerRenderer}
                />
              </tr>
            </thead>
          )}
          <tbody className="fd-table__body">{renderTableBody()}</tbody>
        </table>
      </LayoutPanel.Body>
      {!!pagination &&
        (!pagination.autoHide ||
          filteredEntries.length > pagination.itemsPerPage) && (
          <LayoutPanel.Footer>
            <Pagination
              itemsTotal={filteredEntries.length}
              currentPage={currentPage}
              itemsPerPage={pagination.itemsPerPage}
              onChangePage={setCurrentPage}
            />
          </LayoutPanel.Footer>
        )}
    </LayoutPanel>
  );
};

GenericList.Actions = ListActions;

const PaginationProps = PropTypes.shape({
  itemsPerPage: PropTypes.number.isRequired,
  initialPage: PropTypes.number,
  autoHide: PropTypes.bool,
});

GenericList.propTypes = {
  title: PropTypes.string,
  entriesKind: PropTypes.string,
  entries: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  ).isRequired,
  headerRenderer: PropTypes.func.isRequired,
  rowRenderer: PropTypes.func.isRequired,
  actions: CustomPropTypes.listActions,
  extraHeaderContent: PropTypes.node,
  showSearchField: PropTypes.bool,
  notFoundMessage: PropTypes.string,
  noSearchResultMessage: PropTypes.string,
  serverErrorMessage: PropTypes.string,
  textSearchProperties: PropTypes.arrayOf(PropTypes.string.isRequired),
  showSearchSuggestion: PropTypes.bool,
  showSearchControl: PropTypes.bool,
  actionsStandaloneItems: PropTypes.number,
  testid: PropTypes.string,
  showRootHeader: PropTypes.bool,
  showHeader: PropTypes.bool,
  serverDataError: PropTypes.any,
  serverDataLoading: PropTypes.bool,
  hasExternalMargin: PropTypes.bool,
  pagination: PaginationProps,
  compact: PropTypes.bool,
  className: PropTypes.string,
};

GenericList.defaultProps = {
  notFoundMessage: MESSAGES.NOT_FOUND,
  noSearchResultMessage: MESSAGES.NO_SEARCH_RESULT,
  actions: [],
  textSearchProperties: ['name', 'description'],
  showSearchField: true,
  showSearchControl: true,
  showRootHeader: true,
  showHeader: true,
  showSearchSuggestion: true,
  showSearchControl: true,
  serverDataError: null,
  serverDataLoading: false,
  hasExternalMargin: true,
  compact: true,
};
