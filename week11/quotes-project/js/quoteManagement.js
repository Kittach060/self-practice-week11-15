//CRUD o quotes
import { getItems } from "./myLib/fetchUils";

//GET Quotes
async function loadQuotes() {
    try{
    const quotes = await getItems(`${import.meta.env.VITE_APP_URL}/quotes`)
    console.log(quotes);
    return quotes
    }catch(error){
        alert(error)
    }
}
export { loadQuotes }
