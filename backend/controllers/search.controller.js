const Community = require("../models/community.model");
const User = require("../models/user.model");
const Post = require("../models/post.model");

const search = async (req, res) => {
  try {
    const searchQuery = req.query.q;
    const userId = req.userId;
    const communities = await Community.find({ members: userId }).distinct(
      "_id"
    );

    // Fetch trending posts
    const trendingWeight = {
      likes: 0.38,
      comments: 0.275,
      saves: 0.19,
      timestamp: 0.155
    };

    const trendingPosts = await Post.find()
      .populate({
        path: 'user',
        select: 'name avatar',
      })
      .populate({
        path: 'community',
        select: 'name description banner',
      })
      .lean()
      .exec();

    // Calculate trending score for each post
    trendingPosts.forEach(post => {
      let maxLikes = 1;
    let maxComments = 1;
    let maxSaves = 1;
    
    // console.log(post.likes.length,maxComments,maxSaves);
    trendingPosts.forEach(post => {
      maxLikes = Math.max(maxLikes, post.likes.length);
      maxComments = Math.max(maxComments, post.comments.length);
      // maxSaves = Math.max(maxSaves, post.saves.length);
    });

      // Normalize likes, comments, saves
      maxLikes=maxLikes+1;
      maxComments=maxComments+1;
      maxSaves=maxSaves+1;
      
      // console.log('kk');

      const likesNorm = post.likes.length / maxLikes;
      const commentsNorm = post.comments.length / maxComments;
      // const savesNorm = post.saves.length / maxSaves;

      // Calculate decay factor for timestamp
      const lambda = 0.1; // Decay rate parameter
      const timestampHours = (Date.now() - new Date(post.timestamp)) / (1000 * 60 * 60); // Convert timestamp to hours
      const  decay = 0; // Default decay value

      // Apply time decay if hours >= 4
      if (timestampHours >= 5) {
        decay = Math.exp(-lambda * timestampHours);
      }

      // Calculate trending score
      post.trendingScore = trendingWeight.likes * likesNorm +
                           trendingWeight.comments * commentsNorm +
                           trendingWeight.timestamp*decay;
                           console.log(post.trendingScore)
    });

    // Sort posts by trending score in descending order
    trendingPosts.sort((a, b) => b.trendingScore - a.trendingScore);

    // Limit to top 10 trending posts
    const topTrendingPosts = trendingPosts.slice(0, 10);
    // console.log("hii")
    // console.log(topTrendingPosts[0].trendingScore)

    const [users, posts, joinedCommunity, community] = await Promise.all([
      User.find(
        { $text: { $search: searchQuery } },
        { score: { $meta: "textScore" } }
      )
        .select("_id name email avatar")
        .sort({ score: { $meta: "textScore" } })
        .lean(),
      Post.find({
        community: { $in: communities },
        $text: { $search: searchQuery },
      })
        .select("_id content")
        .populate("user", "name avatar")
        .populate("community", "name")
        .lean()
        .exec(),
      Community.findOne({
        $text: { $search: searchQuery },
        members: { $in: userId },
      }).select("_id name description banner members"),
      Community.findOne({
        $text: { $search: searchQuery },
        members: { $nin: userId },
      }).select("_id name description banner members"),
    ]);

    posts.forEach((post) => {
      if (post.content.length > 30) {
        post.content = post.content.substring(0, 30) + "...";
      }
    });

    res.status(200).json({ posts, users, community, joinedCommunity, trendingPosts: topTrendingPosts });
  } catch (error) {
    res.status(500).json({ message: "An error occurred" });
  }
};

module.exports = search;