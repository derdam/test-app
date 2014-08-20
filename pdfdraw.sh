#!/bin/bash

# pdfdraw.sh - calls pdfdraw and stream output to stdout
# This is a try of a workaround for unability of pdfdraw to output on stdout.

# Implementation

# A named pipe is created for pdfdraw output. i.e. pdf-3.png
# a cat command is used to stream pdf-3.png to stdout
# the pdfdraw command is invoked with pdf-3.png as output file parameter
# the pdf-3-png file is removed


# usage pdfdraw.sh in.pdf 1     # draw page 1 of in.pdf
# cnvOptions = ['-G', reqGamma,'-g', '-R',reqRot,'-r',reqDens,'-o',pOut,pIn,reqPage+1];
# arguments     $1     $2	$3   $4    $5     $6   $7      $8   $9  $a $b

echo pdfdraw $1 $2 $3 $4 
pdfdraw $1 $2 $3 $4

echo done.

# named pipe location and name. Parts of the name are random.
#np=/dev/shm/$1.enc.$2.$RANDOM.png  

# echo Named pipe: $np

#mkfifo -m 600 $np

#cat $np &
# cnvOptions = ['-G', reqGamma,'-g', '-R',reqRot,'-r',reqDens,'-o',pOut,pIn,reqPage+1];

#pdfdraw -o $np $1 $2

#rm $np


