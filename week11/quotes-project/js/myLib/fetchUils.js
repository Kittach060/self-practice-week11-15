//GET
async function getItems(url) {
    try{
    const res = await fetch(url)
    console.log(res);
    const data = await res.json()
    console.log(data);
    return data
    }catch(error){
        throw new Error(error)
    }
}
export { getItems }

