
// Or using destructuring assignment.
const {
  types,
  version,
  observer,
  createWorker,
  getSupportedRtpCapabilities,
  parseScalabilityMode
} = require("mediasoup");


observer.on("newworker",(worker)=>{
    console.log("\x1b[31m%s\x1b[0m", `NEW WORKER WAS INITALIZED`);
    worker.observer.on("newrouter", (router) =>
    {
      console.log(
        "new router created [worker.pid:%d, router.id:%s]",
        worker.pid, router.id);
    
    })

    
})
