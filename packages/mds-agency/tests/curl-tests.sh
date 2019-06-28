#!/bin/bash

export BASE=https://77j9rhwcki.execute-api.us-west-1.amazonaws.com/Prod
export POST="-X POST"
export CONTENT="-H \"Content-Type: application/json\""
export PROVIDER_UUID='c8051767-4b14-4794-abc1-85aad48baff1'
export DEVICE_UUID='ec551174-f324-4251-bfed-28d9f3f473fc'

curl $BASE
echo
curl -d @register_vehicle.json $POST $BASE/register_vehicle
echo
curl -d @deregister_vehicle.json $POST $BASE/deregister_vehicle

echo
