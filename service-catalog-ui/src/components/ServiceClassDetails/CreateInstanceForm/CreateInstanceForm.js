import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FormItem, FormLabel, Icon, Link, FormSelect } from 'fundamental-react';
import * as LuigiClient from '@luigi-project/client';

import SchemaData from './SchemaData';

import './CreateInstanceForm.scss';
import { getResourceDisplayName } from 'helpers';
import { usePost, useNotification, randomNameGenerator } from 'react-shared';

import {
  CustomPropTypes,
  JSONEditor,
  Tooltip,
  CopiableLink,
} from 'react-shared';

const SERVICE_PLAN_SHAPE = PropTypes.shape({
  name: PropTypes.string.isRequired,
  displayName: PropTypes.string.isRequired,
});

CreateInstanceForm.propTypes = {
  onChange: PropTypes.func.isRequired,
  onCompleted: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
  formElementRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  jsonSchemaFormRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  item: PropTypes.object,
};

const parseDefaultIntegerValues = plan => {
  const schema = plan.spec.instanceCreateParameterSchema || null;
  if (schema && schema.properties) {
    const schemaProps = schema.properties;
    Object.keys(schemaProps).forEach(key => {
      if (
        schemaProps[key].default !== undefined &&
        schemaProps[key].type === 'integer'
      ) {
        schemaProps[key].default = Number(schemaProps[key].default);
      }
    });
  }
};

const getInstanceCreateParameterSchema = (plans, currentPlan) => {
  const schema =
    plans?.find(
      e =>
        e.spec.externalMetadata?.displayName === currentPlan ||
        e.metadata.name === currentPlan,
    ) || plans[0]?.name;
  return schema?.spec.instanceCreateParameterSchema || {};
};

const PlanColumnContent = ({ onPlanChange, dropdownRef, allPlans }) => (
  <FormItem>
    <FormLabel required htmlFor="plan">
      Plan
    </FormLabel>
    <FormSelect
      id="plan"
      aria-label="plan-selector"
      ref={dropdownRef}
      onChange={e => onPlanChange(e.target.value)}
    >
      {allPlans.map((p, i) => (
        <option key={['plan', i].join('_')} value={p.metadata.name}>
          {getResourceDisplayName(p)}
        </option>
      ))}
    </FormSelect>
  </FormItem>
);

PlanColumnContent.proTypes = {
  onPlanChange: PropTypes.func.isRequired,
  dropdownRef: CustomPropTypes.ref.isRequired,
  allPlans: PropTypes.arrayOf(SERVICE_PLAN_SHAPE),
};

const isNonNullObject = o => typeof o === 'object' && !!o;

export default function CreateInstanceForm({
  onChange,
  setCustomValid,
  formElementRef,
  jsonSchemaFormRef,
  item,
  documentationUrl,
  plans,
}) {
  const notificationManager = useNotification();
  const postRequest = usePost();
  const [customParametersProvided, setCustomParametersProvided] = useState(
    false,
  );
  const [instanceCreateParameters, setInstanceCreateParameters] = useState({});
  useEffect(() => {
    setCustomValid(true);
    // Make the form initially valid because a form without instanceCreateParameters is always valid.
    // It'll be immiediately overwritten once plan or instanceCreateParameters are changed

    // eslint-disable-next-line
  }, []);

  plans.forEach(plan => {
    parseDefaultIntegerValues(plan);
  });
  const plan = plans[0]?.metadata.name;
  const [
    instanceCreateParameterSchema,
    setInstanceCreateParameterSchema,
  ] = useState({});

  const handlePlanChange = planName => {
    const newParametersSchema = getInstanceCreateParameterSchema(
      plans,
      planName,
    );

    setInstanceCreateParameterSchema(newParametersSchema);
    setInstanceCreateParameters({});
    if (!newParametersSchema || !newParametersSchema.length) {
      jsonSchemaFormRef.current = null;
    }
  };

  // eslint-disable-next-line
  useEffect(_ => handlePlanChange(plan), [plans, plan]);

  const formValues = {
    name: useRef(null),
    plan: useRef(plan),
  };

  const defaultName =
    `${item.spec.externalName}-${randomNameGenerator()}` ||
    randomNameGenerator();

  const instanceCreateParameterSchemaExists =
    instanceCreateParameterSchema &&
    (instanceCreateParameterSchema.$ref ||
      instanceCreateParameterSchema.properties);

  async function createInstance({ name, namespace, labels, inputData }) {
    const input = {
      apiVersion: 'servicecatalog.k8s.io/v1beta1',
      kind: 'ServiceInstance',
      metadata: {
        name,
        namespace,
        labels,
      },
      spec: inputData,
    };

    try {
      await postRequest(
        `/apis/servicecatalog.k8s.io/v1beta1/namespaces/${namespace}/serviceinstances`,
        input,
      );

      notificationManager.notifySuccess({
        content: `Service Instance created`,
      });

      LuigiClient.linkManager()
        .fromContext('namespace')
        .navigate(`instances/details/${name}`);
    } catch (err) {
      notificationManager.notifyError({
        title: `Failed to create the Service Instance`,
        content: err.message,
      });
    }
  }

  const handleCustomParametersChange = input => {
    try {
      const parsedInput = JSON.parse(input);
      if (isNonNullObject(parsedInput)) {
        setInstanceCreateParameters(parsedInput);
        setCustomValid(true);
      }
    } catch (_) {
      setCustomValid(false);
    }
  };

  async function handleFormSubmit(e) {
    e.preventDefault();
    const currentPlan =
      plans?.find(e => e.spec.externalID === formValues.plan.current.value) ||
      (plans?.length && plans[0]);

    const isClusterServiceClass = item.kind === 'ClusterServiceClass';

    const specSC = {
      serviceClassExternalName: item.spec.externalName,
      servicePlanExternalName: currentPlan && currentPlan.spec.externalName,
      parameters: instanceCreateParameters,
    };

    const specCSC = {
      clusterServiceClassExternalName: item.spec.externalName,
      clusterServicePlanExternalName:
        currentPlan && currentPlan.spec.externalName,
      parameters: instanceCreateParameters,
    };

    await createInstance({
      name: formValues.name.current.value,
      namespace: LuigiClient.getContext().namespaceId,
      labels: item.spec.externalMetadata?.labels,
      inputData: isClusterServiceClass ? specCSC : specSC,
    });
  }

  return (
    <>
      <form
        ref={formElementRef}
        // style={{ width: '47em' }}
        onChange={onChange}
        onLoad={onChange}
        onSubmit={handleFormSubmit}
        id="createInstanceForm"
      >
        <div className="grid-wrapper">
          <div className="column">
            <FormItem>
              <FormLabel required htmlFor="instanceName">
                Name
              </FormLabel>
              <input
                className="fd-input"
                ref={formValues.name}
                defaultValue={defaultName}
                type="text"
                id="instanceName"
                placeholder={'Instance name'}
                aria-required="true"
                required
                pattern="^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$"
                autoComplete="off"
              />
            </FormItem>
          </div>
          <div className="column">
            <PlanColumnContent
              onPlanChange={handlePlanChange}
              dropdownRef={formValues.plan}
              allPlans={plans}
            />
          </div>
        </div>
      </form>
      <div className="instance-schema-panel__separator" />
      {instanceCreateParameterSchemaExists && (
        <SchemaData
          key={formValues.plan.current.value}
          schemaFormRef={jsonSchemaFormRef}
          data={instanceCreateParameters || {}}
          instanceCreateParameterSchema={instanceCreateParameterSchema}
          planName={
            (formValues.plan &&
              formValues.plan.current &&
              formValues.plan.current.value) ||
            ''
          }
          onSubmitSchemaForm={() => {}}
          onFormChange={formData => {
            onChange(formData);
            setInstanceCreateParameters(formData.instanceCreateParameters);
          }}
        />
      )}

      {!instanceCreateParameterSchemaExists && (
        <>
          <div className="fd-margin-top--sm fd-margin-bottom--tiny instance-schema-panel">
            <div>
              <Link
                className="link fd-margin-end--tiny clear-underline"
                onClick={() =>
                  setCustomParametersProvided(!customParametersProvided)
                }
              >
                {customParametersProvided
                  ? 'Remove parameters'
                  : 'Add parameters'}
              </Link>
              <Tooltip
                position="top"
                content="The service provider did not define specific parameters for the selected plan. Refer to the documentation to learn about the required parameters, and define them as JSON in the editor."
              >
                <Icon glyph="sys-help" ariaLabel="No schema for parameters" />
              </Tooltip>
            </div>
            {documentationUrl && (
              <CopiableLink url={documentationUrl} text="Documentation" />
            )}
          </div>
          {customParametersProvided && (
            <JSONEditor
              aria-label="schema-editor"
              onChangeText={handleCustomParametersChange}
              text={JSON.stringify(instanceCreateParameters, null, 2)}
            />
          )}
        </>
      )}
    </>
  );
}
