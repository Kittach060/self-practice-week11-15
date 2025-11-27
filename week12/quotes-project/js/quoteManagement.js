//CRUD on quotes
import { getItems } from "./myLib/fetchUtils.js"
const quoteURL = `${import.meta.env.VITE_APP_URL}/quotess`
//GET Quotes
async function loadQuotes() {
  try {
    const quotes = await getItems(quoteURL)
    console.log(quotes)
    return quotes
  } catch (error) {
    alert(`Quote: ${error}`)
  }
}

//ADD
async function addQuote(item) {
  try {
    const addedQuote = await addItem(quoteURL, item)
    return addedQuote
  } catch (error) {
    alert(`Quote: ${error}`)
  }
}
//Create Quote
//Edit Quote

async function editQuote(item) {
  try {
    const editedQuote = await editItem(quoteURL, item)
    return editedQuote
  } catch (error) {
    alert(`Quote: ${error}`)
  }
}


//Delete Quote

async function deleteQuote(id) {
  try {
    const removeId = await deleteItem(quoteURL, id)
    return removeId
  } catch (error) {
    alert(`Quote: ${error}`)
  }
}

export { loadQuotes, deleteQuote, addQuote, editQuote }