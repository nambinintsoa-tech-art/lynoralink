import re  
p = r'c:\Users\Roots\lynoralink\src\components\PostCard.jsx'  
with open(p,'r',encoding='utf-8') as f:  
    c=f.read()  
c=c.replace(chr(111)+chr(110)+chr(82)+chr(101)+chr(112)+chr(108)+chr(121)+chr(61)+chr(123)+chr(111)+chr(110)+chr(82)+chr(101)+chr(112)+chr(108)+chr(121)+chr(125), chr(111)+chr(110)+chr(83)+chr(116)+chr(97)+chr(114)+chr(116)+chr(82)+chr(101)+chr(112)+chr(108)+chr(121)+chr(61)+chr(123)+chr(111)+chr(110)+chr(83)+chr(116)+chr(97)+chr(114)+chr(116)+chr(82)+chr(101)+chr(112)+chr(108)+chr(121)+chr(125))  
with open(p,'w',encoding='utf-8') as f:  
    f.write(c) 
