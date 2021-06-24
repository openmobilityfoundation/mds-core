void setBuildStatus(String message, String state) {
  step([
    $class: "GitHubCommitStatusSetter",
    reposSource: [$class: "ManuallyEnteredRepositorySource", url: "https://github.com/lacuna-tech/mds-core"],
    contextSource: [$class: "ManuallyEnteredCommitContextSource", context: "ci/jenkins/build-status"],
    errorHandlers: [[$class: "ChangingBuildStatusErrorHandler", result: "UNSTABLE"]],
    statusResultSource: [ $class: "ConditionalStatusResultSource", results: [[$class: "AnyBuildResult", message: message, state: state]] ]
  ]);
}

pipeline {

  agent any

  stages {
    stage('Build') {
      steps {
        nvm('version': 'v15.11.0') {
          sh '''
          pnpm clean
          pnpm lint
          pnpm build
          '''
        }
      }
    }
    stage('Test') {
      environment {
        NODE_OPTIONS = '--max_old_space_size=4096'  // fixes nodejs out-of-memory errors such as "Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory"
      }
      steps {
        nvm('version': 'v15.11.0') {
          sh '''
            set -eu
            set -o pipefail

            randport() {
                local port=$((($RANDOM%8000)+1024));
                while nc -zv localhost $port > /dev/null 2>&1; do
                    port=$((($RANDOM%8000)+1024));
                done;
                echo $port
            }

            export PG_PORT=$(randport)
            export REDIS_PORT=$(randport)
            export PORT=$(randport)
            export RPC_PORT=$(randport)
            source env.jenkins

            export PG_ID=$(docker run -d -e POSTGRES_HOST_AUTH_METHOD=trust -p $PG_PORT:5432 postgres:11-alpine)
            export REDIS_ID=$(docker run -d -p $REDIS_PORT:6379 redis:5-alpine)

            function cleanup() {
              docker stop $PG_ID && docker rm $PG_ID
              docker stop $REDIS_ID && docker rm $REDIS_ID
            }
            trap cleanup EXIT

            pnpm clean
            PG_NAME=postgres PG_HOST=localhost PG_USER=postgres REDIS_HOST=localhost pnpm test
          '''
        }
      }
    }

  }

  post {

    success {
      setBuildStatus('Build and tests succeeded! 🤓', 'SUCCESS')
    }

    failure {
      setBuildStatus('Build or tests failed. 😢', 'FAILURE')
    }

  }
}
