from flask import Flask, request, make_response
from flask_cors import CORS
import pandas as pd
import numpy as np
import gzip
import io
import re
import requests
from supabase import create_client, Client
from rapidfuzz import process, fuzz
from rapidfuzz.utils import default_process

# Flask app initialization
app = Flask(__name__)
CORS(app) # Restrict CORS to the frontend URL

# Constants and configuration
SUPABASE_URL = "https://pokscockcjadaffhipop.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBva3Njb2NrY2phZGFmZmhpcG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc3ODExMDksImV4cCI6MjA0MzM1NzEwOX0.L4Dx2JA0QiNeLC0_7m1jIe2SaZ1zHopG2cEbrh208A8"  # Replace with your actual key
BUCKET_NAME = 'Database Processing Module'
BASE_FILENAME = 'OFF_db_p'
FILE_NUMBERS = range(1, 7)  # File numbers 1 to 6
CLEAN_WORDS = {"mix", "bioe", "edk"}
FUZZY_MATCH_THRESHOLD = 77

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Helper functions
def fetch_and_extract(bucket_name: str, base_filename: str, file_numbers: range):
    """
    Fetch and extract multiple gzip-compressed CSV files from Supabase storage.

    Args:
        bucket_name (str): Supabase storage bucket name.
        base_filename (str): Base filename pattern.
        file_numbers (range): Range of file numbers to process.

    Returns:
        list: A list of Pandas DataFrames containing the extracted data.
    """
# Data types of the Open Food Facts database
    # types = {
    #     'code': int,
    #     'brands': str,
    #     'product_name': str,
    #     'countries_en': str,
    #     'nutriscore_grade': str
    # }

    dataframes = []
    try:
        for i in file_numbers:
            file_name = f"{base_filename}{i}.csv.gz"
            
            # Fetch and decompress the file from Supabase storage
            file_response = supabase.storage.from_(bucket_name).download(file_name)
            with gzip.GzipFile(fileobj=io.BytesIO(file_response)) as gz_file:
                dataframe = pd.read_csv(gz_file)
                dataframes.append(dataframe)

        return dataframes
    
    except Exception as e:
        print(f"Error fetching files: {e}")
        return None
    
def preprocess_text(s: str) -> str:
    """
    Preprocess a string by removing numbers, filtering short or irrelevant words,
    and replacing certain characters.

    Args:
        s (str): Input string to preprocess.

    Returns:
        str: Preprocessed string.
    """
    s = default_process(s)
    s = re.sub(r'\d+', '', s)
    s = " ".join(word for word in s.split() if word not in CLEAN_WORDS and len(word)>3)
    s = s.replace("oe","ö").replace("ue", "ü").replace("ae","ä")
    return s

def search_open_food_facts(product_code: str):
    """
    Search for a product in the Open Food Facts API by its product code.

    Args:
        product_code (str): Product code to search for.

    Returns:
        dict or None: Product data if found, else None.
    """
    url = f"https://world.openfoodfacts.org/api/v2/product/{product_code}.json"
    response = requests.get(url)
    if response.status_code == 200:
        product_data = response.json()
        if product_data.get('status') == 1:
                return product_data['product']
    return None

def perform_fuzzy_matching(unmatched_db, off_db):
    """
    Perform fuzzy matching between unmatched products and the OFF database.

    Args:
        unmatched_db (pd.DataFrame): DataFrame of unmatched products.
        off_db (pd.DataFrame): DataFrame of Open Food Facts database products.

    Returns:
        pd.DataFrame: DataFrame with fuzzy matches.
    """
    # Preprocess OFF product names
    processed_off = [default_process(name) for name in off_db['product_name']]
    choices_list = {idx: el for idx, el in enumerate(processed_off)}

    def find_match(description):
        if pd.isna(description):
            return (np.nan, np.nan, np.nan, np.nan)
        fuzzy_match = process.extractOne(description, choices_list, scorer=fuzz.token_sort_ratio)
        if fuzzy_match and fuzzy_match[1] > FUZZY_MATCH_THRESHOLD:
            match_idx = fuzzy_match[2]
            match_code = off_db.iloc[match_idx]['code']
            return fuzzy_match[0], fuzzy_match[1], match_idx, match_code
        return (np.nan, np.nan, np.nan, np.nan)
    
    unmatched_db['processed_name'] = unmatched_db['ARTIKELBESCHREIBUNG'].apply(preprocess_text)
    unmatched_db[['product_name','score','index_position','code']] = unmatched_db['processed_name'].apply(find_match).apply(pd.Series)

    return unmatched_db.drop(columns=['processed_name','score','index_position'])

@app.route('/', methods=['POST'])
def process_request():
    """
    Process the POST request and generate a CSV file with matched results.

    Returns:
        Response: CSV file response.
    """
    # Fetch and merge datasets
    dataframes = fetch_and_extract(BUCKET_NAME, BASE_FILENAME, FILE_NUMBERS)

    if not dataframes:
        return "Error: Unable to fetch files.", 500

    off_db = pd.concat(dataframes)
    #off_db['code'] = off_db['code'].astype(str) 
    off_db['product_name'] = off_db['product_name'].astype(str)

    # Extract data
    raw_data = request.data
    columns_to_extract = ['TRANSAKTIONSDATUM','PARTNER','ARTIKELCODE', 'ARTIKELBESCHREIBUNG', 'INCENTIVIERTER_UMSATZ' ]  
    participants_db = pd.read_excel(io.BytesIO(raw_data), usecols=columns_to_extract)
    # Filter and normalize participants data
    participants_db = participants_db[participants_db["PARTNER"].str.contains("Edeka|Marktkauf",case=False, na=False)]
    participants_db.drop('PARTNER', axis=1, inplace=True)
    participants_db.fillna(0, inplace=True) 
    participants_db['ARTIKELBESCHREIBUNG'] = participants_db['ARTIKELBESCHREIBUNG'].astype(str).str.strip().str.lower()
    participants_db['TRANSAKTIONSDATUM'] = participants_db['TRANSAKTIONSDATUM'].str[:10]
    participants_db['TRANSAKTIONSDATUM'] = pd.to_datetime(participants_db["TRANSAKTIONSDATUM"].str[:10])
    participants_db = participants_db.loc[participants_db["ARTIKELBESCHREIBUNG"]!="pfand"]
  
    # Merge DataFrames to find matches
    # By code
    matches_code = pd.merge(participants_db, off_db, left_on='ARTIKELCODE', right_on='code', how='inner') 
    # By name
    # Sorts the results to keep the rows with least Missing Values, more scans and most recently updated
    off_db_drop = off_db.sort_values(by=['Missing Values','unique_scans_n','last_updated_t'], ascending=[True,False,False]).drop_duplicates(['product_name'], keep='first')
    matches_name = pd.merge(participants_db, off_db_drop, left_on='ARTIKELBESCHREIBUNG', right_on='product_name', how='inner')
 
    # Select needed columns
    matches_code = matches_code[['ARTIKELCODE','code','ARTIKELBESCHREIBUNG','product_name']]
    matches_name = matches_name[['ARTIKELCODE','code','ARTIKELBESCHREIBUNG','product_name']] 

    # Find entries that are not in matches_code and creates one complete database
    matches_name = matches_name[~matches_name['ARTIKELCODE'].isin(matches_code['ARTIKELCODE'])]
    matched_complete = pd.concat([matches_code, matches_name], ignore_index=True)

    # Find the remaining unmatched entries
    unmatched_db = participants_db[~participants_db["ARTIKELCODE"].isin(matched_complete["ARTIKELCODE"])]
    unmatched_db = unmatched_db[["ARTIKELCODE", "ARTIKELBESCHREIBUNG"]].drop_duplicates(['ARTIKELBESCHREIBUNG','ARTIKELCODE'], keep='first')
   
    # Performs fuzzy matching
    fuzzy_matches = perform_fuzzy_matching(unmatched_db, off_db_drop)
    
    # Combine matches and drop duplicates while selecting relevant columns
    matched_final = (
        pd.concat([matched_complete[["ARTIKELCODE", "code"]], fuzzy_matches[["ARTIKELCODE", "code"]]], ignore_index=True)
        .merge(off_db, on="code")
        .drop_duplicates(subset=["ARTIKELCODE"])
        .drop(columns=["Missing Values", "unique_scans_n", "completeness", "last_updated_t"])
    )

    # Merge with participants_db and reorganize columns
    participants_matched = participants_db.merge(matched_final, how="left", on="ARTIKELCODE")
    participants_matched.insert(2, "OFF Code", participants_matched.pop("code"))
    participants_matched.insert(4, "OFF Name", participants_matched.pop("product_name"))

    # Rename columns for clarity
    participants_matched.rename(
        columns={
            "TRANSAKTIONSDATUM": "Transaction Date",
            "ARTIKELCODE": "Original Code",
            "ARTIKELBESCHREIBUNG": "Original Name",
            "INCENTIVIERTER_UMSATZ": "Price"
        },
        inplace=True
    )
      
    # Convert DataFrame to CSV
    output = io.StringIO()
    participants_matched.to_csv(output, index=False, sep=";")
    csv_content = output.getvalue()
    output.close()

    # Send CSV as a response
    response = make_response(csv_content)
    response.headers["Content-Disposition"] = "attachment; filename=enriched_data.csv"
    response.headers["Content-Type"] = "text/csv"
    return response

if __name__ == '__main__':
    app.run(debug=True)


