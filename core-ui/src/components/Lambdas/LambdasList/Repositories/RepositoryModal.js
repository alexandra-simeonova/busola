import React, { useState } from 'react';

import { Button } from 'fundamental-react';

import { useCreateRepository } from 'components/Lambdas/hooks';

import { ModalWithForm } from 'react-shared';
import RepositoryForm, { FORM_TYPE } from './RepositoryForm';

import { REPOSITORIES_LIST } from 'components/Lambdas/constants';

export function CreateRepositoryModal({
  repositoryNames = [],
  serverDataError = false,
  serverDataLoading = false,
}) {
  const createRepository = useCreateRepository();
  const [invalidModalPopupMessage, setInvalidModalPopupMessage] = useState('');

  const modalOpeningComponent = (
    <Button
      glyph="add"
      option="transparent"
      disabled={Boolean(serverDataError || serverDataLoading)}
    >
      {REPOSITORIES_LIST.CREATE_MODAL.OPEN_BUTTON.TEXT}
    </Button>
  );

  return (
    <ModalWithForm
      title={REPOSITORIES_LIST.CREATE_MODAL.TITLE}
      modalOpeningComponent={modalOpeningComponent}
      confirmText={REPOSITORIES_LIST.CREATE_MODAL.CONFIRM_BUTTON.TEXT}
      invalidPopupMessage={invalidModalPopupMessage}
      id="create-repository-modal"
      className="repositories-list__create-repository-modal"
      renderForm={props => (
        <RepositoryForm
          {...props}
          onSubmitAction={createRepository}
          repositoryNames={repositoryNames}
          setInvalidModalPopupMessage={setInvalidModalPopupMessage}
          formType={FORM_TYPE.CREATE}
        />
      )}
    />
  );
}
