#!/bin/bash

# This script will extract the nth page of an encrypted pdf document.
# v beta - poc. page extraction will be performed with default values.

# decrypt pdf in a temp file
# we could have use redirection or pipe, but pdfdraw doesn't support them.



tmp=/dev/shm/tmp-$3-$RANDOM.pdf

echo $tmp

# Sample call for decrypting a document
#openssl enc -aes-256-cbc -d -in #8de86417238d2a75685cd689fe43d2384e38b042fdb345cfe0e9489397238a2097bbbc88856e627a60d94aa2098241f7eb0f81af42481e84630bd70c121dcff1.pdf.enc -#out $tmp -k ...

openssl enc -aes-256-cbc -d -in $1 -out $tmp -k $4

#pdfinfo -f 1 $tmp

pdfdraw -o $2 $tmp $3
rm $tmp

