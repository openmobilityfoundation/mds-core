#!/usr/bin/env bash

formulas=("kubernetes-helm" "brew install txn2/tap/kubefwd" "pgsql")
tools=$(dirname ${0})/../tools
istio=1.2.4
os=${MDS_OS:-`uname`}
OSX=Darwin
red=`tput setaf 9`
reset=`tput sgr0`

usage() {
  [ "${1}" ] && echo "${red}error: ${1}${reset}"

  cat << EOF
usage: $(basename ${0}) [commands]

commands:
  bootstrap             : install dependencies
  build                 : build project
  install               : install project
  test                  : preform unit and integration tests
  unit-test             : perform unit tests
  integration-test      : perform integration tests
  postgresql            : create a postgresql console
  uninstall             : uninstall
  uninstall-mds         : uninstall mds
  uninstall-istio       : uninstall istio
  proxy                 : port forward to kuberneetes cluster
  forward               : port forward all s
  dashboard-token       : put dashboard-token in copy buffer
  help                  : help message
EOF

  [ "${1}" ] && exit 1 || exit 0
}

bootstrap() {
  case "${os}" in
    ${OSX}) brew bundle --file=$(dirname ${0})/Brewfile || usage "brew bundle failed";;
    *) usage "unsupported os: ${os}";;
  esac

  helm init || usage "helm intialization failure"
  helm repo add stable https://kubernetes-charts.storage.googleapis.com
  helm repo add banzaicloud-stable https://kubernetes-charts.banzaicloud.com
  helm dependency update
  helm plugin install https://github.com/lrills/helm-unittest

  kubectl apply -f \
    https://raw.githubusercontent.com/kubernetes/dashboard/v1.10.1/src/deploy/recommended/kubernetes-dashboard.yaml
  cat <<EOF | kubectl apply -f - || echo "kubernetes dashboard installation failure"
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: admin-user
  namespace: kube-system
EOF
  kubectl port-forward $(kubectl get pods -n=kube-system |
    grep kubernetes-dashboard | cut -d' ' -f1) 8443:8443 -n=kube-system &

  istioPath=${tools}/istio-${istio}

  if [ ! -d ${istioPath} ]; then
    mkdir -p ${tools}
    (cd ${tools}; curl -L https://git.io/getLatestIstio | ISTIO_VERSION=${istio} sh -)
  fi

  export PATH=${istioPath}/bin:${PATH}

  istioctl verify-install || usage "istio installation failure"

  [[ $(kubectl get namespace istio-system) ]] || {
    kubectl create namespace istio-system
    helm template ${istioPath}/install/kubernetes/helm/istio-init \
      --name istio-init \
      --namespace istio-system | kubectl apply -f -
  
    # todo: fix
    # [ "$(kubectl -n istio-sytem get crds | grep "istio.io" | wc -l)" -eq "23" ] || \
    #   usage "istio installation failure"
  
    helm template ${istioPath}/install/kubernetes/helm/istio \
      --name istio \
      --namespace istio-system --values \
      ${istioPath}/install/kubernetes/helm/istio/values-istio-demo.yaml | \
      kubectl apply -f -
    kubectl label namespaces default istio-injection=enabled
  }
}

build()  {
  (cd ..; yarn; yarn build; yarn image)
}

installMds() {
  # todo: don't install if secret exists
  kubectl create secret generic pg-pass --from-literal 'postgresql-password=Password123#'
  helm install --name mds .
}

unitTest() {
  (cd ..; yarn test)
  helm unittest .
}

integrationTest() {
  helm unittest .
  usage "todo: cypress"
}

postgresql() {
  # note: assumes `kubefwd svc -n default` is running
  pgcli postgres://mdsadmin@mds-postgresql:5432/mds || usage "pgcli failure"
}

uninstallMds() {
  helm delete --purge mds
}

uninstallIstio() {
  istioPath=${tools}/istio-${istio}

  helm template ${istioPath}/install/kubernetes/helm/istio \
  --name istio \
  --namespace istio-system \
  --values ${istioPath}/install/kubernetes/helm/istio/values-istio-demo.yaml | \
    kubectl delete -f -
  kubectl delete namespace istio-system
  kubectl delete -f ${istioPath}/install/kubernetes/helm/istio-init/files
}

proxy() {
  kubectl proxy &
}

forward() {
  sudo kubefwd services -n default
}

dashboardToken() {
    case "${os}" in
      ${OSX}) kubectl -n kube-system describe secret $(kubectl -n kube-system get secret | \
        grep admin-user | awk '{print $1}') | grep ^token | cut -d: -f2 | tr -d '[:space:]' | \
        pbcopy;;
      *) usage "unsupported os: ${os}";;
    esac
}

if [[ $# != 0 ]]; then 
  for arg in "$@"; do
    case "${arg}" in
      bootstrap) bootstrap || usage  "${arg} failure";;
      build) build || usage "${arg} failure";;
      install) installMds || usage "${arg} failure";;
      install-mds) installMds;;
      test)
        unitTest || usage "unitTests failure"
        integrationTest || usage "integrationTest failure";;
      unit-test) unitTest || usage "${arg} failure";;
      integration-ntest) integrationtTest || usage  "${arg} failure";;
      postgresql|postgres) postgresql || usage "${arfg} failure";;
      uninstall)
        uninstallMds || usage "uninstallMds failure"
        uninstallIstio || usage "uninstallIstio failure";;
      uninstall-mds) uninstallMds || usage "${arg} failure";;
      uninstall-istio) uninstallIstio || usage "${arg} failure";;
      proxy) proxy || usage "${arg} failure";;
      forward) forward || usage "${arg} failure";;
      dashboard-token) dashboardToken || usage "${arg} failure";;
      help|*) usage;;
    esac
  done
else
  usage
fi