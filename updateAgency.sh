echo building
cd container-images/mds-agency;
yarn image;
sleep 2;
echo removing old pod
kubectl delete pod $(kubectl get pods -A -o=name | sed "s/^.\{4\}//" | grep '^mds-agency') -n mds;
echo kubectl logs $(kubectl get pods -A -o=name | sed "s/^.\{4\}//" | grep '^mds-agency') mds-agency -n mds -f;