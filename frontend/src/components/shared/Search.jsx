import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import debounce from "lodash/debounce";
import { MoonLoader } from "react-spinners";
import { MdClear } from "react-icons/md";

const BASE_URL = process.env.REACT_APP_API_URL;

const Search = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [community, setCommunity] = useState(null);
  const [joinedCommunity, setJoinedCommunity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [showTrending, setShowTrending] = useState(false); // State to manage visibility of trending posts
  const accessToken = JSON.parse(localStorage.getItem("profile"))?.accessToken;
  const setInitialValue = () => {
    setUsers([]);
    setPosts([]);
    setCommunity(null);
    setJoinedCommunity(null);
    setLoading(false);
  };

  const debouncedHandleSearch = useMemo(
    () =>
      debounce((q) => {
        setLoading(true);
        const encodedQuery = encodeURIComponent(q);
        axios
          .get(`${BASE_URL}/search?q=${encodedQuery}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          })
          .then((res) => {
            const { posts, users, community, joinedCommunity, trendingPosts } = res.data;
            setPosts(posts);
            setUsers(users);
            setCommunity(community);
            setJoinedCommunity(joinedCommunity);
            setTrendingPosts(trendingPosts);
            setLoading(false);
          })
          .catch((error) => {
            console.error("Error searching:", error);
            setLoading(false);
          });
      }, 800),
    [accessToken]
  );

  useEffect(() => {
    axios
      .get(`${BASE_URL}/posts/trending`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })
      .then((res) => {
        setTrendingPosts(res.data);
      })
      .catch((error) => {
        console.error("Error fetching trending posts:", error);
      });
  }, [accessToken]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    if (value === "") {
      setInitialValue();
      return;
    }

    debouncedHandleSearch(value);
  };

  const clearValues = () => {
    setInitialValue();
    setInputValue("");
  };

  const handleTrendingClick = (postId) => {
    navigate(`/post/${postId}`);
  };

  const handleTrendingButtonClick = () => {
    setShowTrending(!showTrending); // Toggle trending posts visibility
  };

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          id="search"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Search for people, posts or communities"
          className="h-10 py-1 bg-white border w-full md:w-[660px] rounded-full text-sm shadow-sm focus:outline-none focus:shadow-outline-blue focus:border-blue-500 transition duration-300 pl-3 pr-10"
          aria-label="Search"
          autoComplete="off"
        />
        <button
          className="absolute top-0 right-12 h-full w-10 flex items-center justify-center text-gray-400 hover:text-gray-600"
          onClick={handleTrendingButtonClick} // Toggle trending posts visibility
        >
          Trending
        </button>
        {inputValue !== "" && (
          <button
            className="absolute top-0 right-0 h-full w-10 flex items-center justify-center text-gray-400 hover:text-gray-600"
            onClick={clearValues}
          >
            <MdClear />
          </button>
        )}
      </div>

      {showTrending && ( // Show trending posts if the button is clicked
        <div
          onBlur={() => !community && clearValues()}
          className="absolute start-0 md:start-auto w-screen top-12 md:w-[660px] bg-white border rounded-md shadow-md"
        >
          <div className="py-2 px-4">
            <p className="text-gray-600 text-sm font-semibold mb-2">
              Trending Posts
            </p>
            {trendingPosts.slice(0, 5).map((post) => (
              <div
                key={post._id}
                onClick={() => handleTrendingClick(post._id)}
                className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-100 px-3 rounded-md"
              >
                <div className="flex items-center">
                  <img
                    src={post.user.avatar}
                    alt={post.user.name}
                    className="h-8 w-8 rounded-full object-cover mr-2"
                    loading="lazy"
                  />
                  <div>
                    <p className="text-gray-700 text-sm">{post.title}</p>
                    <p className="text-gray-500 text-xs">
                      {post.community.description.length > 80
                        ? post.community.description.substring(0, 80) + "..."
                        : post.community.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-2 px-2">
          <MoonLoader size={20} color={"#008cff"} />
          <span className="ml-2">Searching...</span>
        </div>
      )}

      {posts.length > 0 && (
        <ul className="z-30">
          {posts.map((post) => (
            <li key={post._id} className="border-b py-2 px-4 cursor-pointer">
              <div
                onClick={() => navigate(`/post/${post._id}`)}
                className="block text-sm text-gray-700 hover:text-blue-500"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <img
                      src={post.user.avatar}
                      alt={post.user.name}
                      className="h-8 w-8 rounded-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">
                      {post.title}
                    </div>
                    <div className="text-sm text-gray-500">
                      {post.content}
                    </div>
                    <div className="text-sm text-gray-500">
                      Posted by {post.user.name} in {post.community.name}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Search;
