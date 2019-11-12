echo building
cd container-images/mds-event-processor;
yarn image;
sleep 2;
cd ../../container-images/mds-trip-processor;
yarn image;
sleep 2;
cd ../..container-images/mds-provider-processor;
yarn image;
sleep 2;
echo removing old pod
kubectl delete pod $(kubectl get pods -A -o=name | sed "s/^.\{4\}//" | grep '^mds-event-processor') -n mds;
echo kubectl logs $(kubectl get pods -A -o=name | sed "s/^.\{4\}//" | grep '^mds-event-processor') mds-event-processor -n mds -f;