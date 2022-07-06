
let pps =[{name:"nnn"},{name:"cc"},{name:"xxx"},{name:"nnn"},{name:"nnn"}]


testimo = (pps)=>{
   // pps=[...pps,{name:"nnn"}]
 //   pps.filter(item=>item.name !=="nnn")
   //  pps.pop()
   let useIndex = pps.findIndex(item => item.name === "nnn" )
console.log(useIndex)
console.log(pps.filter(item=>item.name !=="nnn"))

  // pps.splice(1, 1); 

    }
    
    

testimo(pps)

//console.log(pps)