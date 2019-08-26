#!/usr/bin/env bash

tools=$(dirname ${0})/../tools
os=${MDS_OS:-`uname`}
istio=${ISTIO_VERSION:-1.2.4}
defaultToolchain=${MDS_TOOLCHAIN:-kubernetes-helm,kubefwd,pgcli}
defaultBootstrap=${MDS_BOOTSTRAP:-helm,dashboard,istio,logging}
defaultInstall=${MDS_INSTALL:-helm,dashboard,istio,logging,mds}
defaultTest=${MDS_TEST:-unit,integration}
defaultUninstall=${MDS_UNINSTALL:-mds,logging,istio,dashboard,helm}
defaultForward=${MDS_FORWARD:-default}
defaultToken=${MDS_TOKEN:-dashboard}
defaultReinstall=${MDS_REINSTALL:-helm,dashboard,istio,logging,mds}
OSX=Darwin
red=`tput setaf 9`
reset=`tput sgr0`

warn() {
  echo "${red}warn: ${1}${reset}"
}

usage() {
  [ "${1}" ] && warn "${1}"

  cat << EOF
usage: $(basename ${0}) [commands]

commands:
  bootstrap                                           : install dependencies; default: ${defaultToolchain},${defaultBootstrap}
  build                                               : build project
  install[:helm,dashboard,istio,logging,mds]          : install specified components; default: ${defaultInstall}
  forward[:default,logging,kube-system,istio-system]  : regisgter host names for services in the provided namespace(s); default: ${defaultForward}
  test[:unit,integration]                             : preform specified tests; default: ${defaultTest}
  token[:dashboard]                                   : get specified token, copied to copy-paste buffer for osx; default: ${defaultToken}
  cli:[postgresql,redis]                              : create a cli console for the provided service
  uninstall[:mds,logging,istio,dashboard,helm]        : uninstall specified components; default: ${defaultUninstall}
  reinstall[:helm,dashboard,istio,logging,mds]        : reinstall specified components; default: ${defaultReinstall}
  help                                                : help message

example:
  % ./bin/mds.sh bootstrap build install:mds forward test:integration

applications:
  http://kubernetes-dashboard                         : kubernetes dashboard; see https://github.com/kubernetes/dashboard
  http://kibana:5601                                  : kibana; see https://www.elastic.co/products/kibana
  http://prometheus:9090                              : prometheus; see https://prometheus.io
  http://tracing                                      : jaeger; see https://www.jaegertracing.io
  http://kiali:20001                                  : kiali; see https://www.kiali.io

pre-requisites:
  docker desktop with kubernetes                      : see https://www.docker.com/products/docker-desktop
  bash 4.x                                            : see https://www.gnu.org/software/bash/
  homebrew                                            : see https://brew.sh
  yarn                                                : see https://yarnpkg.com/en/
  nvm                                                 : see https://nvm.sh
  lerna                                               : see https://lerna.js.org
EOF

  [ "${1}" ] && exit 1 || exit 0
}

bootstrap() {
  case "${os}" in
    ${OSX})
      if ! hash brew 2>/dev/null; then
        /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
      fi
      brew bundle --file=$(dirname ${0})/Brewfile || usage "brew bundle failed";;
    *) usage "unsupported os: ${os}";;
  esac

# todo: boostrap all-the-things

  for y in cypress mocha chai mochawesome; do
    if [ $(yarn ${y} --version > /dev/null 2>&1) ]; then
      echo "yarn add -W ${y}"
    fi
  done

  invoke install "$(normalize ${defaultBootstrap})"
}

build()  {
  yarn
  yarn build
  yarn image
}

installHelm() {
  if ! hash helm 2>/dev/null ; then
    case "${os}" in
      ${OSX}) brew install kubernetes-helm;;
      *) usage "unsupported os: ${os}";;
    esac
  fi

  helm init || usage "helm intialization failure"
  helm repo add stable https://kubernetes-charts.storage.googleapis.com
  helm repo add banzaicloud-stable https://kubernetes-charts.banzaicloud.com
  helm dependency update
  helm plugin install https://github.com/lrills/helm-unittest
}

installDashboard() {
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
}

installIstio() {
  istioPath=${tools}/istio-${istio}

  if [ ! -d ${istioPath} ]; then
    mkdir -p ${tools}
    (cd ${tools}; curl -L https://git.io/getLatestIstio | ISTIO_VERSION=${istio} sh -)
  fi

  ${istioPath}/bin/istioctl verify-install || warn "istio verify installation failure"

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

installLogging() {
  helm install --name logging ./charts/logging
}

installMds() {
  # todo: don't install if secret exists
  kubectl create secret generic pg-pass --from-literal 'postgresql-password=Password123#'
  helm install --name mds ./charts/mds
}

forward() {
  # todo: not entirely sure backgrounding is optimal
  for n in ${@}; do
    sudo --background kubefwd services -n ${n}
  done
}

# todo: unforward

testUnit() {
  # todo: make mds unit tests work
  # yarn test

  for c in mds; do #logging; do
    helm unittest ./charts/${c}
  done
}

testIntegration() {
  # todo: provide [ ui | cli ] option
  # $(npm bin)/cypress open
  $(npm bin)/cypress run
}

tokenDashboard() {
  case "${os}" in
    ${OSX}) kubectl -n kube-system describe secret $(kubectl -n kube-system get secret | \
      grep admin-user | awk '{print $1}') | grep ^token | cut -d: -f2 | tr -d '[:space:]' | \
      pbcopy;;
    *) kubectl -n kube-system describe secret $(kubectl -n kube-system get secret | \
      grep admin-user | awk '{print $1}') | grep ^token | cut -d: -f2 | tr -d '[:space:]';;
  esac
}

cliPostgresql() {
  # note: assumes `kubefwd svc -n default` is running
  pgcli postgres://mdsadmin@mds-postgresql:5432/mds
}

cliRedis() {
  # note: assumes `kubefwd svc -n default` is running
  redis-cli -u redis://mds-redis-master:6379/0
}

uninstallMds() {
  helm delete --purge mds
}

uninstallLogging() {
  helm delete --purge logging
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

uninstallDashboard() {
  kubectl delete deployment kubernetes-dashboard --namespace=kube-system 
  kubectl delete service kubernetes-dashboard  --namespace=kube-system 
  kubectl delete role kubernetes-dashboard-minimal --namespace=kube-system 
  kubectl delete rolebinding kubernetes-dashboard-minimal --namespace=kube-system
  kubectl delete sa kubernetes-dashboard --namespace=kube-system 
  kubectl delete secret kubernetes-dashboard-certs --namespace=kube-system
  kubectl delete secret kubernetes-dashboard-key-holder --namespace=kube-system
}

uninstallHelm() {
  case "${os}" in
    ${OSX}) brew uninstall kubernetes-helm;;
    *) usage "unsupported os: ${os}";;
  esac
}

invoke() {
  for arg in ${2}; do
    ${1}${arg^} || warn "${1} error: ${arg}"
  done
}

normalize() {
  echo "$(echo ${1} | cut -d ':' -f 2 | tr ',' ' ')"
}

[[ $# == 0 ]] && usage

for arg in "$@"; do
  case "${arg}" in
    bootstrap) bootstrap || warn  "${arg} failure";;
    build) build || usage "${arg} failure";;
    install) arg="${defaultInstall}";&
    install:*) invoke install "$(normalize ${arg})";;
    forward) arg="${defaultForward}";&
    forward:*) forward "$(normalize ${arg})";;
    test) arg="${defaultTest}";&
    test:*) invoke test "$(normalize ${arg})";;
    token) arg="${defaultToken}";&
    token:*) invoke token "$(normalize ${arg})";;
    cli:*) invoke cli "$(normalize ${arg})";;
    uninstall) arg="${defaultUninstall}";&
    uninstall:*) invoke uninstall "$(normalize ${arg})";;
    reinstall) arg="${defaultReinstall}";&
    reinstall:*)
      invoke uninstall "$(normalize ${arg})"
      invoke install "$(normalize ${arg})";;
    help) usage;;
    *) usage "unknown command: ${arg}"
  esac
done
