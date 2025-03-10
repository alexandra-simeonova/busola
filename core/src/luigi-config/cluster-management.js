import { setAuthData, clearAuthData } from './auth/auth-storage';
import { reloadNavigation } from './navigation/navigation-data-init';
import { reloadAuth, hasNonOidcAuth } from './auth/auth';
import { saveLocation } from './navigation/previous-location';
import { parseOIDCParams } from './auth/oidc-params';
import {
  areParamsCompatible,
  showIncompatibleParamsWarning,
} from './init-params/params-version';
import {
  DEFAULT_HIDDEN_NAMESPACES,
  DEFAULT_FEATURES,
} from './init-params/constants';
import { getClusterParams } from './cluster-params';

const CLUSTERS_KEY = 'busola.clusters';
const CURRENT_CLUSTER_NAME_KEY = 'busola.current-cluster-name';

export async function setActiveClusterIfPresentInUrl() {
  const match = location.pathname.match(/^\/cluster\/(.*?)\//);
  if (match) {
    const clusterName = decodeURIComponent(match[1]);
    const clusters = await getClusters();
    if (clusterName in clusters) {
      saveActiveClusterName(clusterName);
    }
  }
}

export function getCurrentContextNamespace(kubeconfig) {
  const currentContextName = kubeconfig['current-context'];
  const context = kubeconfig.contexts.find(c => c.name === currentContextName);
  return context?.context.namespace;
}

export async function setCluster(clusterName) {
  const clusters = await getClusters();
  const params = clusters[clusterName];

  if (!areParamsCompatible(params?.config?.version)) {
    showIncompatibleParamsWarning(params?.config?.version);
  }

  saveActiveClusterName(clusterName);
  try {
    await reloadAuth();

    const preselectedNamespace = getCurrentContextNamespace(params.kubeconfig);
    const kubeconfigUser = params.currentContext.user.user;

    const targetLocation =
      `/cluster/${encodeURIComponent(clusterName)}/namespaces` +
      (preselectedNamespace ? `/${preselectedNamespace}/details` : '');

    if (hasNonOidcAuth(kubeconfigUser)) {
      setAuthData(kubeconfigUser);
      await reloadNavigation();
      Luigi.navigation().navigate(targetLocation);
    } else {
      saveLocation(targetLocation);
      location = location.origin;
    }
  } catch (e) {
    console.warn(e);
    alert('An error occured while setting up the cluster.');
    saveActiveClusterName(null);
  }
}

export async function saveClusterParams(params) {
  const { kubeconfig } = params;
  const { users } = kubeconfig;
  if (users?.length) {
    users.forEach(user => {
      user.user = user.user || {};
      if (!hasNonOidcAuth(user.user) && !!user.exec) {
        // it's needed for the downloaded kubeconfig to work
        user.user.exec = createLoginCommand(parseOIDCParams());
      }
    });
  }

  const clusterName = params.currentContext.cluster.name;
  const clusters = await getClusters();
  clusters[clusterName] = params;
  saveClusters(clusters);
}

export async function getActiveCluster() {
  const clusterName = getActiveClusterName();
  if (!clusterName) {
    return null;
  }
  const clusters = await getClusters();
  return clusters[clusterName];
}

export function getActiveClusterName() {
  return localStorage.getItem(CURRENT_CLUSTER_NAME_KEY);
}

export function saveActiveClusterName(clusterName) {
  localStorage.setItem(CURRENT_CLUSTER_NAME_KEY, clusterName);
}

// setup params:
// defaults < config from CM < init params
async function mergeParams(params) {
  const defaultConfig = {
    navigation: {
      disabledNodes: [],
      externalNodes: [],
    },
    hiddenNamespaces: DEFAULT_HIDDEN_NAMESPACES,
    features: DEFAULT_FEATURES,
    ...(await getClusterParams()).config,
  };

  params.config = { ...defaultConfig, ...params.config };

  // Don't merge hiddenNamespaces, use the defaults only when params are empty
  params.config.hiddenNamespaces =
    params.config?.hiddenNamespaces || DEFAULT_HIDDEN_NAMESPACES;

  return params;
}

export async function getClusters() {
  const clusters = JSON.parse(localStorage.getItem(CLUSTERS_KEY) || '{}');
  for (const clusterName in clusters) {
    clusters[clusterName] = await mergeParams(clusters[clusterName]);
  }
  return clusters;
}

export async function deleteCluster(clusterName) {
  const clusters = await getClusters();
  delete clusters[clusterName];
  saveClusters(clusters);
}

export async function deleteActiveCluster() {
  await deleteCluster(getActiveClusterName());
  await reloadAuth();
  clearAuthData();
  saveActiveClusterName(null);
  Luigi.navigation().navigate('/clusters');
  // even though we navigate to /clusters, Luigi complains it can't find
  // current cluster path in navigation - skip a frame to fix it
  await new Promise(resolve => setTimeout(resolve));
  await reloadNavigation();
}

export function saveClusters(clusters) {
  localStorage.setItem(CLUSTERS_KEY, JSON.stringify(clusters));
}
