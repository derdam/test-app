#!/bin/bash

# This script get info from a page of an encrypted pdf document.
# if specified page is 0, metadata for the whole document are returned.
# if specified page is 

# new usage: ./pdfinfo.sh -f 1 <infile>.pdf  -k ...]
#                         $1 $2 $3           $4  $5

# *deprecated* usage: ./pdfinfo.sh <infile>.pdf -f 1 [-k ...]
# v beta - poc. page extraction will be performed with default values.

# decrypt pdf in a temp file
# *TODO* Check if pdfinfo supports pipes / input redirection !
# pdfinfo version 0.18.4 does not seems to support pipes / redirections !


# determine if user wants to use an encrypted document.
# in this case, $4 should match '-d'

if [ ${3: -4} == ".enc" ]; then
 echo encrypted file.


	tmp=/dev/shm/tmp-info-$RANDOM.pdf


# Sample call for decrypting a document
#openssl enc -aes-256-cbc -d -in #8de86417238d2a75685cd689fe43d2384e38b042fdb345cfe0e9489397238a2097bbbc88856e627a60d94aa2098241f7eb0f81af42481e84630bd70c121dcff1.pdf.enc -#out $tmp -k ...

	
	openssl enc -aes-256-cbc -d -in $3 -out $tmp -k $5
	pdfinfo $1 $2 -l $2 $tmp 	
	
	rm $tmp

else

   pdfinfo $1 $2 -l $2 $3

fi

