# MDS Helm Chart

## Cluster Constituents

* [Kubernetes](https://kubernetes.io) cluster
* [Istio 1.1.x](https://istio.io) services
* [Helm](https://helm.sh) kubernetes application package manager
  * [Google Charts Repository](https://kubernetes-charts.storage.googleapis.com/)
  * [Banzai Cloud Charts Repository](https://kubernetes-charts.banzaicloud.com/)
  * [Helm UnitTest Plugin](https://github.com/lrills/helm-unittest)
* Tools
  * (optional) [Kubernetes Dashboard](https://github.com/kubernetes/dashboard)
  * (optional) [kubefwd](https://github.com/txn2/kubefwd)
  * (optional) [pgcli](https://www.pgcli.com)

## Cluster Installation

### [Kubernetes](https://kubernetes.io)

```bash
open https://download.docker.com/mac/stable/Docker.dmg
# preferences / advanced : cpus:6, memory:8G, swap:8G
# preferences / kubernetes: enable kubernetes:true, show system containers:true
export PATH=/Applications/Docker.app/Contents/Resources/bin:${PATH}
kubectl config set-context docker-desktop
```

### [Istio](https://istio.io)

Note that for the last step (labeling the namespace for istio injection), you will need to specify the namespace into which MDS will be installed.  In this example, the default namespace is used.

```bash
(mkdir -p [PROJECT-DIR]; cd [PROJECT-DIR]; curl -L https://git.io/getLatestIstio | \
  ISTIO_VERSION=1.2.4 sh -)
export PATH=[PROJECT-DIR]/istio-1.2.4/bin:${PATH}
istioctl verify-install
kubectl create namespace istio-system
helm template [PROJECT-DIR]/istio-1.2.4/install/kubernetes/helm/istio-init \
  --name istio-init \
  --namespace istio-system | kubectl apply -f -
[ "$(kubectl -n istio-system get crds | grep 'istio.io' | wc -l)" -eq "23" ] && \
      echo "istio is initialized" || echo "istio is not initialized"
# install an istio-cluster-profile: demo (note: not for production)
helm template [PROJECT-DIR]/istio-1.2.4/install/kubernetes/helm/istio \
  --name istio \
  --namespace istio-system --values \
  [PROJECT-DIR]/istio-1.2.4/install/kubernetes/helm/istio/values-istio-demo.yaml | \
  kubectl apply -f -
kubectl label namespaces default istio-injection=enabled
```

### [Helm](https://helm.sh)

Binaries can be installed from the [Helm GitHub releases page](https://github.com/helm/helm/releases)

```bash
helm repo add stable https://kubernetes-charts.storage.googleapis.com
helm repo add banzaicloud-stable https://kubernetes-charts.banzaicloud.com
helm dependency update
helm plugin install https://github.com/lrills/helm-unittest
```

### (optional) [Kubernetes Dashboard](https://github.com/kubernetes/dashboard)

```bash
kubectl apply -f \
  https://raw.githubusercontent.com/kubernetes/dashboard/v1.10.1/src/deploy/recommended/kubernetes-dashboard.yaml
cat <<EOF | kubectl apply -f -
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
# verify
# todo: add notes regarding logging in via kube-config file
open http://localhost:8001/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/
kubectl -n kube-system describe secret $(kubectl -n kube-system get secret | \
  grep admin-user | awk '{print $1}') | grep ^token | cut -d: -f2 | tr -d '[:space:]' | pbcopy
kubectl proxy &
kubectl port-forward $(kubectl get pods -n=kube-system |
  grep kubernetes-dashboard | cut -d' ' -f1) 8443:8443 -n=kube-system &
open https://localhost:8443
```

### Verification

```bash
kubectl version
kubectl cluster-info
kubectl get nodes
kubectl get namespaces
kubectl get svc -n istio-system
kubectl get pods -n istio-system
```

## Configuration

### Helm Chart Configuration (values.yaml)

`apis:` does not need to be modified for normal usage

`useJwtAuth:` enables JWT authorization for each endpoint.  Required for production usage.  Note that some admin operations (e.g. database initialization) require a scoped token - see below for how to work around this when this field is set to `false`.

`aws.enabled:` configures an EKS-specific ingress gateway

`aws.certificateArn:` configures the ingress gateway with an AWS Certificate Manager (ACM) certificate.

`registry`: Image registry domain name for pulling container images.  If empty, helm will look for images on the local host.

### Credentials

Create a Postgresql password secret in the kubernetes cluster.  Note that this command will put the password string into your command history and also make it briefly visible in the system process table:

```bash
kubectl create secret generic pg-pass --from-literal 'postgresql-password=Password123#'
```

### JWT

If you're not using JWT, you'll still need to include a token in the header for APIs requiring an authorization scope.  Here's how to generate a fake scoped token:

```bash
TOKEN=.$(base64 <<< '{"scope": "admin:all test:all"}').
curl -H "Authorization: Bearer $TOKEN" http://localhost/agency/test/initialize
```

### Registry

If you are using a private container image registry, you may need to add its credentials:

```bash
kubectl create secret generic registry-login \
  --from-file=.dockerconfigjson=${HOME}/.docker/config.json \
  --type=kubernetes.io/dockerconfigjson
```

## MDS Installation

At this point, you should be able to deploy an MDS cluster from this directory noting that if you're using a custom values file, you'll need to add the argument `--values=...` to this command, if you're using a custom namespace, you'll want to add the `--namespace=...` argument, etc.:

```bash
helm install --name mds ./helm

# prometheus
kubectl port-forward $(kubectl get pods -n=istio-system | \
  grep prometheus | cut -d' ' -f1) 9090:9090 -n=istio-system &
```

## Dashboards

* [prometheus](htttp://localhost:9090)
* (optional) [dashboard](https://localhost:8443)

## Development (work in progress)

### Helm

The following [helm sub-commands](https://helm.sh/docs/helm/) ease chart development:

```bash
# materialize the specified template
helm template --set [KEY]=[VLAUE] ... -x templates/[TEMPLATE] --debug ./helm
# largely the same as 'helm template'
helm install --set [KEY]=[VALUE] ... --dry-run --debug ./helm
# checks the chart for well-formedness
helm lint --set [KEY]=[VALUE] ... --debug ./helm
```

### Helm tests

```bash
helm unittest ./helm
```

### Database/PostgreSQL

```bash
sudo kubefwd svc -n default &
pgcli postgres://mdsadmin@mds-postgresql:5432/mds
```

## Cleanup

### Uninstall MDS

```bash
helm delete --purge mds
```

### Uninstall Istio

```bash
helm template [PROJECT-DIR]/istio-1.2.4/install/kubernetes/helm/istio \
  --name istio \
  --namespace istio-system \
  --values [PROJECT-DIR]/istio-1.2.4/install/kubernetes/helm/istio/values-istio-demo.yaml | \
    kubectl delete -f -
kubectl delete namespace istio-system
kubectl delete -f [PROJECT-DIR]/istio-1.2.4/install/kubernetes/helm/istio-init/files
```
