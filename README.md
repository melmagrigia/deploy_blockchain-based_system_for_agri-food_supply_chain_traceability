# Deploy a Blockchain-based System for Agri-Food Supply Chain Traceability

This work, made for the project of Dependable Distributed Systems course at Sapienza University, is
based on the architecture presented in the following paper:

**Marchese Angelo, and Orazio Tomarchio. "A blockchain-based system for agri-food supply chain traceability management." SN Computer Science 3.4 (2022): 279**.

[https://doi.org/10.1007/s42979-022-01148-3](https://doi.org/10.1007/s42979-022-01148-3)

## 1. Create kubernetes cluster

To start deploying our network we first of all need to have a Kubernetes cluster.

Also ensure you have these ports available before creating the cluster:

-   80
-   443

### Using K3D

```bash
k3d cluster create  -p "80:30949@agent:0" -p "443:30950@agent:0" --agents 2 k8s-hlf
```

## 2. Install and configure Istio

Install Istio binaries on the machine:

```bash
# add TARGET_ARCH=x86_64 if you are using arm64
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.20.0 sh -
export PATH="$PATH:$PWD/istio-1.20.0/bin"
```

Install Istio on the Kubernetes cluster:

```bash
kubectl create namespace istio-system

istioctl operator init

kubectl apply -f - <<EOF
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-gateway
  namespace: istio-system
spec:
  addonComponents:
    grafana:
      enabled: false
    kiali:
      enabled: false
    prometheus:
      enabled: false
    tracing:
      enabled: false
  components:
    ingressGateways:
      - enabled: true
        k8s:
          hpaSpec:
            minReplicas: 2
          resources:
            limits:
              cpu: 500m
              memory: 512Mi
            requests:
              cpu: 100m
              memory: 128Mi
          service:
            ports:
              - name: http
                port: 80
                targetPort: 8080
                nodePort: 30949
              - name: https
                port: 443
                targetPort: 8443
                nodePort: 30950
            type: NodePort
        name: istio-ingressgateway
    pilot:
      enabled: true
      k8s:
        hpaSpec:
          minReplicas: 1
        resources:
          limits:
            cpu: 300m
            memory: 512Mi
          requests:
            cpu: 100m
            memory: 128Mi
  meshConfig:
    accessLogFile: /dev/stdout
    enableTracing: false
    outboundTrafficPolicy:
      mode: ALLOW_ANY
  profile: default

EOF
```

### Configure Internal DNS

This needs to be applied every time you restart the machine.

```bash
kubectl apply -f - <<EOF
kind: ConfigMap
apiVersion: v1
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
           lameduck 5s
        }
        rewrite name regex (.*)\.localho\.st istio-ingressgateway.istio-system.svc.cluster.local
        hosts {
          fallthrough
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf {
           max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
EOF
```

## 3. Install Hyperledger Fabric operator

In this step we are going to install the kubernetes operator for Fabric, this will install:

-   CRD (Custom Resource Definitions) to deploy Certification Fabric Peers, Orderers and Authorities
-   Deploy the program to deploy the nodes in Kubernetes

To install helm: [https://helm.sh/docs/intro/install/](https://helm.sh/docs/intro/install/)

```bash
helm repo add kfs https://kfsoftware.github.io/hlf-helm-charts --force-update

helm upgrade --install hlf-operator --version=1.10.0 -- kfs/hlf-operator
```


### Install the Kubectl plugin

To install the kubectl plugin, you must first install Krew:
[https://krew.sigs.k8s.io/docs/user-guide/setup/install/](https://krew.sigs.k8s.io/docs/user-guide/setup/install/)

Afterwards, the plugin can be installed with the following command:

```bash
kubectl krew install hlf
```

## 4. Deploy the organizations CA's and Peers

### Environment Variables for AMD and ARM

```bash
export PEER_IMAGE=hyperledger/fabric-peer
export PEER_VERSION=2.5.5

export ORDERER_IMAGE=hyperledger/fabric-orderer
export ORDERER_VERSION=2.5.5

export CA_IMAGE=hyperledger/fabric-ca
export CA_VERSION=1.5.7
```

### Deploy the RegulatoryDepartmentMSP certificate authority

```bash
export STORAGE_CLASS=local-path

kubectl hlf ca create  --image=$CA_IMAGE --version=$CA_VERSION --storage-class=$STORAGE_CLASS --capacity=1Gi --name=regulatory-department-ca \
    --enroll-id=enroll --enroll-pw=enrollpw --hosts=regulatory-department-ca.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabriccas.hlf.kungfusoftware.es --all
```

Check that the certification authority is deployed and works:

```bash
curl -k https://regulatory-department-ca.localho.st:443/cainfo
```

Register a user in the certification authority of the peer organization (RegulatoryDepartmentMSP)

```bash
# register user in CA for peers
kubectl hlf ca register --name=regulatory-department-ca --user=peer --secret=peerpw --type=peer \
 --enroll-id enroll --enroll-secret=enrollpw --mspid RegulatoryDepartmentMSP

```

### Deploy the RetailerMSP certificate authority

```bash
export STORAGE_CLASS=local-path

kubectl hlf ca create  --image=$CA_IMAGE --version=$CA_VERSION --storage-class=$STORAGE_CLASS --capacity=1Gi --name=retailer-ca \
    --enroll-id=enroll --enroll-pw=enrollpw --hosts=retailer-ca.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabriccas.hlf.kungfusoftware.es --all
```

Check that the certification authority is deployed and works:

```bash
curl -k https://retailer-ca.localho.st:443/cainfo
```

Register a user in the certification authority of the peer organization (RetailerMSP)

```bash
# register user in CA for peers
kubectl hlf ca register --name=retailer-ca --user=peer --secret=peerpw --type=peer \
 --enroll-id enroll --enroll-secret=enrollpw --mspid RetailerMSP

```

### Deploy the ProducerMSP certificate authority

```bash
export STORAGE_CLASS=local-path

kubectl hlf ca create  --image=$CA_IMAGE --version=$CA_VERSION --storage-class=$STORAGE_CLASS --capacity=1Gi --name=producer-ca \
    --enroll-id=enroll --enroll-pw=enrollpw --hosts=producer-ca.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabriccas.hlf.kungfusoftware.es --all
```

Check that the certification authority is deployed and works:

```bash
curl -k https://producer-ca.localho.st:443/cainfo
```

Register a user in the certification authority of the peer organization (ProducerMSP)

```bash
# register user in CA for peers
kubectl hlf ca register --name=producer-ca --user=peer --secret=peerpw --type=peer \
 --enroll-id enroll --enroll-secret=enrollpw --mspid ProducerMSP

```

### Deploy the DelivererMSP certificate authority

```bash
export STORAGE_CLASS=local-path

kubectl hlf ca create  --image=$CA_IMAGE --version=$CA_VERSION --storage-class=$STORAGE_CLASS --capacity=1Gi --name=deliverer-ca \
    --enroll-id=enroll --enroll-pw=enrollpw --hosts=deliverer-ca.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabriccas.hlf.kungfusoftware.es --all
```

Check that the certification authority is deployed and works:

```bash
curl -k https://deliverer-ca.localho.st:443/cainfo
```

Register a user in the certification authority of the peer organization (DelivererMSP)

```bash
# register user in CA for peers
kubectl hlf ca register --name=deliverer-ca --user=peer --secret=peerpw --type=peer \
 --enroll-id enroll --enroll-secret=enrollpw --mspid DelivererMSP

```

### Deploy the ManufacturerMSP certificate authority

```bash
export STORAGE_CLASS=local-path

kubectl hlf ca create  --image=$CA_IMAGE --version=$CA_VERSION --storage-class=$STORAGE_CLASS --capacity=1Gi --name=manufacturer-ca \
    --enroll-id=enroll --enroll-pw=enrollpw --hosts=manufacturer-ca.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabriccas.hlf.kungfusoftware.es --all
```

Check that the certification authority is deployed and works:

```bash
curl -k https://manufacturer-ca.localho.st:443/cainfo
```

Register a user in the certification authority of the peer organization (ManufacturerMSP)

```bash
# register user in CA for peers
kubectl hlf ca register --name=manufacturer-ca --user=peer --secret=peerpw --type=peer \
 --enroll-id enroll --enroll-secret=enrollpw --mspid ManufacturerMSP
```

### Deploy the ManufacturerMSP peer 

```bash
kubectl hlf peer create --statedb=leveldb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=$STORAGE_CLASS --enroll-id=peer --mspid=ManufacturerMSP \
        --enroll-pw=peerpw --capacity=5Gi --name=manufacturer-peer --ca-name=manufacturer-ca.default \
        --hosts=peer-manufacturer.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabricpeers.hlf.kungfusoftware.es --all
```

Check that the peer is deployed and works:

```bash
openssl s_client -connect peer-manufacturer.localho.st:443
```

### Deploy the RegulatoryDepartmentMSP peer 

```bash
kubectl hlf peer create --statedb=leveldb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=$STORAGE_CLASS --enroll-id=peer --mspid=RegulatoryDepartmentMSP \
        --enroll-pw=peerpw --capacity=5Gi --name=regulatory-department-peer --ca-name=regulatory-department-ca.default \
        --hosts=peer-regulatory-department.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabricpeers.hlf.kungfusoftware.es --all
```

Check that the peer is deployed and works:

```bash
openssl s_client -connect peer-regulatory-department.localho.st:443
```

### Deploy the RetailerMSP peer 

```bash
kubectl hlf peer create --statedb=leveldb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=$STORAGE_CLASS --enroll-id=peer --mspid=RetailerMSP \
        --enroll-pw=peerpw --capacity=5Gi --name=retailer-peer --ca-name=retailer-ca.default \
        --hosts=peer-retailer.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabricpeers.hlf.kungfusoftware.es --all
```

Check that the peer is deployed and works:

```bash
openssl s_client -connect peer-retailer.localho.st:443
```

### Deploy the ProducerMSP peer 

```bash
kubectl hlf peer create --statedb=leveldb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=$STORAGE_CLASS --enroll-id=peer --mspid=ProducerMSP \
        --enroll-pw=peerpw --capacity=5Gi --name=producer-peer --ca-name=producer-ca.default \
        --hosts=peer-producer.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabricpeers.hlf.kungfusoftware.es --all
```

Check that the peer is deployed and works:

```bash
openssl s_client -connect peer-producer.localho.st:443
```

### Deploy the DelivererMSP peer 

```bash
kubectl hlf peer create --statedb=leveldb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=$STORAGE_CLASS --enroll-id=peer --mspid=DelivererMSP \
        --enroll-pw=peerpw --capacity=5Gi --name=deliverer-peer --ca-name=deliverer-ca.default \
        --hosts=peer-deliverer.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabricpeers.hlf.kungfusoftware.es --all
```

Check that the peer is deployed and works:

```bash
openssl s_client -connect peer-deliverer.localho.st:443
```

## 5. Deploy the orderer organization

To deploy an `Orderer` organization we have to:

1. Create a certification authority
2. Register user `orderer` with password `ordererpw`
3. Create orderer

### Create the certification authority

```bash
kubectl hlf ca create  --image=$CA_IMAGE --version=$CA_VERSION --storage-class=$STORAGE_CLASS --capacity=1Gi --name=ord-ca \
    --enroll-id=enroll --enroll-pw=enrollpw --hosts=ord-ca.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabriccas.hlf.kungfusoftware.es --all

```

Check that the certification authority is deployed and works:

```bash
curl -vik https://ord-ca.localho.st:443/cainfo
```

### Register user `orderer`

```bash
kubectl hlf ca register --name=ord-ca --user=orderer --secret=ordererpw \
    --type=orderer --enroll-id enroll --enroll-secret=enrollpw --mspid=OrdererMSP --ca-url="https://ord-ca.localho.st:443"

```

### Deploy orderer

```bash
kubectl hlf ordnode create --image=$ORDERER_IMAGE --version=$ORDERER_VERSION \
    --storage-class=$STORAGE_CLASS --enroll-id=orderer --mspid=OrdererMSP \
    --enroll-pw=ordererpw --capacity=2Gi --name=ord-node1 --ca-name=ord-ca.default \
    --hosts=orderer0-ord.localho.st --admin-hosts=admin-orderer0-ord.localho.st --istio-port=443

# admin host = channel participation API

kubectl wait --timeout=180s --for=condition=Running fabricorderernodes.hlf.kungfusoftware.es --all
```

Check that the orderer is running:

```bash
kubectl get pods
```

```bash
openssl s_client -connect orderer0-ord.localho.st:443
```

## 6. Create a channel

To create the channel we need to first create the wallet secret, which will contain the identities used by the operator to manage the channel

### Register and enrolling OrdererMSP identity

```bash
# register
kubectl hlf ca register --name=ord-ca --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=OrdererMSP


kubectl hlf identity create --name orderer-admin-sign --namespace default \
    --ca-name ord-ca --ca-namespace default \
    --ca ca --mspid OrdererMSP --enroll-id admin --enroll-secret adminpw # sign identity

kubectl hlf identity create --name orderer-admin-tls --namespace default \
    --ca-name ord-ca --ca-namespace default \
    --ca tlsca --mspid OrdererMSP --enroll-id admin --enroll-secret adminpw # tls identity

```

### Register and enrolling ManufacturerMSP identity

```bash
# register
kubectl hlf ca register --name=manufacturer-ca --namespace=default --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=ManufacturerMSP

# enroll
kubectl hlf identity create --name manufacturer-admin --namespace default \
    --ca-name manufacturer-ca --ca-namespace default \
    --ca ca --mspid ManufacturerMSP --enroll-id admin --enroll-secret adminpw
```

### Register and enrolling RegulatoryDepartmentMSP identity

```bash
# register
kubectl hlf ca register --name=regulatory-department-ca --namespace=default --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=RegulatoryDepartmentMSP

# enroll
kubectl hlf identity create --name regulatory-department-admin --namespace default \
    --ca-name regulatory-department-ca --ca-namespace default \
    --ca ca --mspid RegulatoryDepartmentMSP --enroll-id admin --enroll-secret adminpw
```

### Register and enrolling RetailerMSP identity

```bash
# register
kubectl hlf ca register --name=retailer-ca --namespace=default --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=RetailerMSP

# enroll
kubectl hlf identity create --name retailer-admin --namespace default \
    --ca-name retailer-ca --ca-namespace default \
    --ca ca --mspid RetailerMSP --enroll-id admin --enroll-secret adminpw
```

### Register and enrolling ProducerMSP identity

```bash
# register
kubectl hlf ca register --name=producer-ca --namespace=default --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=ProducerMSP

# enroll
kubectl hlf identity create --name producer-admin --namespace default \
    --ca-name producer-ca --ca-namespace default \
    --ca ca --mspid ProducerMSP --enroll-id admin --enroll-secret adminpw
```

### Register and enrolling DelivererMSP identity

```bash
# register
kubectl hlf ca register --name=deliverer-ca --namespace=default --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=DelivererMSP

# enroll
kubectl hlf identity create --name deliverer-admin --namespace default \
    --ca-name deliverer-ca --ca-namespace default \
    --ca ca --mspid DelivererMSP --enroll-id admin --enroll-secret adminpw
```

### Create main channel

```bash
export IDENT_8=$(printf "%8s" "")
export ORDERER0_TLS_CERT=$(kubectl get fabricorderernodes ord-node1 -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )

kubectl apply -f - <<EOF
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricMainChannel
metadata:
  name: demo
spec:
  name: demo
  adminOrdererOrganizations:
    - mspID: OrdererMSP
  adminPeerOrganizations:
    - mspID: RegulatoryDepartmentMSP
  channelConfig:
    application:
      acls: null
      capabilities:
        - V2_0
      policies: null
    capabilities:
      - V2_0
    orderer:
      batchSize:
        absoluteMaxBytes: 1048576
        maxMessageCount: 10
        preferredMaxBytes: 524288
      batchTimeout: 2s
      capabilities:
        - V2_0
      etcdRaft:
        options:
          electionTick: 10
          heartbeatTick: 1
          maxInflightBlocks: 5
          snapshotIntervalSize: 16777216
          tickInterval: 500ms
      ordererType: etcdraft
      policies: null
      state: STATE_NORMAL
    policies: null
  externalOrdererOrganizations: []
  peerOrganizations:
    - mspID: RegulatoryDepartmentMSP
      caName: "regulatory-department-ca"
      caNamespace: "default"
  identities:
    OrdererMSP:
      secretKey: user.yaml
      secretName: orderer-admin-tls
      secretNamespace: default
    OrdererMSP-sign:
      secretKey: user.yaml
      secretName: orderer-admin-sign
      secretNamespace: default
    RegulatoryDepartmentMSP:
      secretKey: user.yaml
      secretName: regulatory-department-admin
      secretNamespace: default
  externalPeerOrganizations: []
  ordererOrganizations:
    - caName: "ord-ca"
      caNamespace: "default"
      externalOrderersToJoin:
        - host: ord-node1
          port: 7053
      mspID: OrdererMSP
      ordererEndpoints:
        - orderer0-ord.localho.st:443
      orderersToJoin: []
  orderers:
    - host: orderer0-ord.localho.st
      port: 443
      tlsCert: |-
${ORDERER0_TLS_CERT}
  
EOF
```


## 7. Join peer from RegulatoryDepartment to the channel

To join the peer from RegulatoryDepartmentMSP to the channel `demo` we need to create a `FabricFollowerChannel` resource:

```bash
kubectl apply -f - <<EOF
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricFollowerChannel
metadata:
  name: demo-regulatory-department-msp
spec:
  anchorPeers:
    - host: peer-regulatory-department.default
      port: 7051
  hlfIdentity:
    secretKey: user.yaml
    secretName: regulatory-department-admin
    secretNamespace: default
  mspId: RegulatoryDepartmentMSP
  name: demo
  externalPeersToJoin: []
  orderers:
    - certificate: |
${ORDERER0_TLS_CERT}
      url: grpcs://ord-node1.default:7050
  peersToJoin:
    - name: peer-regulatory-department
      namespace: default
EOF
```


## 8. Install a chaincode

### Prepare connection string for a peer

To prepare the connection string, we have to:

1. Create `FabricNetworkConfig` object in the Kubernetes cluster
2. Fetch the connection string from the Kubernetes secret

3. Get connection string without users for organization RegulatoryDepartmentMSP and OrdererMSP

```bash
# This identity will register and enroll the user for RegulatoryDepartment
kubectl hlf identity create --name regulatory-department-admin --namespace default \
    --ca-name regulatory-department-ca --ca-namespace default \
    --ca ca --mspid RegulatoryDepartmentMSP --enroll-id explorer-admin --enroll-secret explorer-adminpw \
    --ca-enroll-id=enroll --ca-enroll-secret=enrollpw --ca-type=admin


kubectl hlf networkconfig create --name=regulatory-department-cp \
  -o RegulatoryDepartmentMSP -o OrdererMSP -c demo \
  --identities=regulatory-department-admin.default --secret=regulatory-department-cp

### Fetch the connection string from the Kubernetes secret

```bash
kubectl get secret regulatory-department-cp -o jsonpath="{.data.config\.yaml}" | base64 --decode > regulatory-department.yaml
```

### Install chaincode

```bash
# remove the code.tar.gz chaincode.tgz if they exist
rm code.tar.gz chaincode.tgz
export CHAINCODE_NAME=asset
export CHAINCODE_LABEL=asset
cat << METADATA-EOF > "metadata.json"
{
    "type": "ccaas",
    "label": "${CHAINCODE_LABEL}"
}
METADATA-EOF
## chaincode as a service
cat > "connection.json" <<CONN_EOF
{
  "address": "${CHAINCODE_NAME}:7052",
  "dial_timeout": "10s",
  "tls_required": false
}
CONN_EOF

tar cfz code.tar.gz connection.json
tar cfz chaincode.tgz metadata.json code.tar.gz
export PACKAGE_ID=$(kubectl hlf chaincode calculatepackageid --path=chaincode.tgz --language=node --label=$CHAINCODE_LABEL)
echo "PACKAGE_ID=$PACKAGE_ID"

kubectl hlf chaincode install --path=./chaincode.tgz \
    --config=regulatory-department.yaml --language=golang --label=$CHAINCODE_LABEL --user=regulatory-department-admin-default --peer=peer-regulatory-department.default
```

## 9. Deploy chaincode container on cluster

The following command will create or update the CRD based on the packageID, chaincode name, and docker image.

```bash
kubectl hlf externalchaincode sync --image=kfsoftware/chaincode-external:latest \
    --name=$CHAINCODE_NAME \
    --namespace=default \
    --package-id=$PACKAGE_ID \
    --tls-required=false \
    --replicas=1
```

## 10. Approve chaincode

To approve the chaincode definition for regulatory-department, run the following command:

```bash
export SEQUENCE=1
export VERSION="1.0"
export ENDORSEMENT_POLICY="OR('RegulatoryDepartmentMSP.member')"

kubectl hlf chaincode approveformyorg --config=regulatory-department.yaml --user=regulatory-department-admin-default --peer=peer-regulatory-department.default \
    --package-id=$PACKAGE_ID \
    --version "$VERSION" --sequence "$SEQUENCE" --name=asset \
    --policy="${ENDORSEMENT_POLICY}" --channel=demo

```

## 11. Commit chaincode

To commit chaincode to the channel, run the following command:

```bash
kubectl hlf chaincode commit --config=regulatory-department.yaml --user=regulatory-department-admin-default --mspid=RegulatoryDepartmentMSP \
    --version "$VERSION" --sequence "$SEQUENCE" --name=asset \
    --policy="${ENDORSEMENT_POLICY}" --channel=demo
```

## 12. Deploy the Web Server and the Application Server

Now we deploy the application server with the mongo DB and the web server.

For simplicity we show the steps to deploy just the one for the Regulatory Department MSP Organization.
If you want to deploy both servers for each organization you need to create new YAML files using as template the ones for the Regulatory Department and change them with the information from the corresponding organization.
You also need to update the main channel adding the identity of the peer of the organization you want to add and also to repete the steps 7 and 8 of the guide with the peer informations.
For accessing the react app from the browser you need also to change the REACT_APP_API_URL in the confimap.yaml, for local deployments set it with the Kubernetes node address. 

Create a test-network folder and create inside of it a cert.pem and a pk files with inside, respectively, the regulatory-department-admin-default public and private keys and a ca.crt file with the TLS certificate of the regulatory-department-peer.
You can find the content for this files in the regulatory-department.yaml that we fetched before.

```bash
kubectl apply -f mongo-config.yaml
kubectl apply -f mongo-secret.yaml
kubectl apply -f mongo.yaml
kubectl create secret generic express-certificates --from-file=test-network/
kubectl apply -f persistent-volume.yaml
kubectl apply -f react-app-build-job.yaml
kubectl apply -f express-deployment.yaml
kubectl apply -f configmap.yaml
kubectl apply -f nginx-deployment.yaml
```

## 13. Test the system 
Go with your browser to your-node-url:30100 and test both functionalities
