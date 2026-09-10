SELECT column_name FROM information_schema.columns WHERE table_name = 'Post' AND column_name IN ('commentsLocked','commentatorsLimit');
