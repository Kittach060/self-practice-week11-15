//sync
console.log("starting...");
console.log("working...");
console.log("ending...");

//async
console.log("starting...");
setTimeout(() => console.log("working..."), 5000)
console.log("ending...");

function doSomething(hasProblem){
    return new Promise ((resolve, reject) => {
        setTimeout(() => hasProblem ? reject('Fail Working'):resolve('Fully Complete'),5000)
    })
}

// const workingStatus = doSomething()
// console.log(workingStatus);
// console.log("ending...");

//1) using .then().catch()
// console.log("starting...");
// doSomething(true).then((workingStatus)=>{
//     console.log(workingStatus);
//     console.log("ending...");
// })
// .catch((errrorMessage) => {
//     console.log(errrorMessage);
    
// })

//2) async-await
console.log("staring...");
async function runWorking() {
    try{
        const workingStatus = await doSomething(false)
    console.log(workingStatus);
    console.log('ending...'); 
    }
    catch(error){
        console.log(error);
        
    }
}
runWorking()
