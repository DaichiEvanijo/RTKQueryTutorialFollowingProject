// import { useDispatch } from "react-redux";
// import { reactionAdded } from "./postsSlice";
import { useAddReactionsMutation } from "./postsSlice"

const reactionEmoji = {
    thumbsUp: '👍',
    wow: '😮',
    heart: '❤️',
    rocket: '🚀',
    coffee: '☕'
}

const ReactionButtons = ({ post }) => {
    // const dispatch = useDispatch()
    const [addReactions] = useAddReactionsMutation()

    const reactionButtons = Object.entries(reactionEmoji).map(([name, emoji]) => {
        return (
            <button
                key={name}
                type="button"
                className="reactionButton"
                onClick={() =>{
                    // dispatch(reactionAdded({ postId: post.id, reaction: name }))
                    const newValue = post.reactions[name] + 1
                    addReactions({postId:post.id, reactions:{...post.reactions, [name]:newValue}})
                }}
            >
                {emoji} {post.reactions[name]}
            </button>
        )
    })

    return <div>{reactionButtons}</div>
}
export default ReactionButtons