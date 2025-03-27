import gzip
import pandas as pd
import os
from supabase import create_client, Client
import io
import tempfile

# Fields to bring from the Open Food Facts database
fields=["code","url","last_updated_t","product_name","packaging_en","brands","countries_en","ingredients_text","nutriscore_grade","nova_group","pnns_groups_1","pnns_groups_2","environmental_score_grade","unique_scans_n","completeness","main_category_en","energy-kcal_100g","fat_100g","saturated-fat_100g","carbohydrates_100g","sugars_100g","fiber_100g","salt_100g","proteins_100g"]

# Read the CSV from Open Food Facts in chunks
chunks = pd.read_csv('https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz', 
                     sep="\t", 
                     chunksize=100000, 
                     on_bad_lines='skip',dtype={'code': 'string'})

filtered_chunks = []

for chunk in chunks:
    chunk = chunk[fields]
    filtered_chunks.append(chunk)

# Concatenate all chunks into a single DataFrame
OFF_db = pd.concat(filtered_chunks, ignore_index=True)

# Complete the DataFrame with extra "Missing Values" and "Code length" columns
long = len(OFF_db.columns)
OFF_db.insert(long, "Missing Values", OFF_db.isna().sum(axis=1)) 
OFF_db.insert(long+1, "Code length", OFF_db['code'].str.len())

# Preprocess the OFF DataFrame to keep only valid codes and normalize the product names.
OFF_db = OFF_db[(8 <= OFF_db['Code length']) & (OFF_db['Code length'] <= 14)].drop(columns=(["Code length"]))
OFF_db['product_name'] = OFF_db['product_name'].astype(str).str.strip().str.lower()

# Divide equally the OFF DataFrames
long = round(len(OFF_db)/6)
OFF_db_p1 = OFF_db[:long]
OFF_db_p2 = OFF_db[long:long*2]
OFF_db_p3 = OFF_db[long*2:long*3]
OFF_db_p4 = OFF_db[long*3:long*4]
OFF_db_p5 = OFF_db[long*4:long*5]
OFF_db_p6 = OFF_db[long*5:]

del OFF_db

#################################################################################################################
# CHANGE THIS for Storage tool of your choice 

# Connect with Supabase
url = "https://pokscockcjadaffhipop.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBva3Njb2NrY2phZGFmZmhpcG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc3ODExMDksImV4cCI6MjA0MzM1NzEwOX0.L4Dx2JA0QiNeLC0_7m1jIe2SaZ1zHopG2cEbrh208A8"
supabase: Client = create_client(url, key)

# Delete previous versions of the OFF files in Supabase
file_range = range(1, 7) 

for i in file_range:
    file_name = f"OFF_db_p{i}.csv.gz"
    supabase.storage.from_('Database Processing Module').remove([file_name])

# Upload new DataFrames to Supabase
for i in file_range:

    file = globals()[f"OFF_db_p{i}"]  

    buffer = io.BytesIO()
    with gzip.GzipFile(fileobj=buffer, mode="w") as gz:
        file.to_csv(gz, index=False)
    buffer.seek(0)  

    bucket_name = "Database Processing Module"  
    file_path = f"OFF_db_p{i}.csv.gz"  

    with tempfile.NamedTemporaryFile(delete=False, suffix=".gz") as temp_file:
        temp_file.write(buffer.getvalue()) 
        temp_file_path = temp_file.name

    response = supabase.storage.from_(bucket_name).upload(file_path, temp_file_path)

    os.remove(temp_file_path)

#################################################################################################################