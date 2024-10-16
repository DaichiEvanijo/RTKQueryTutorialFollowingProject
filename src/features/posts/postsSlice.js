import {
    createSelector,
    createEntityAdapter
} from "@reduxjs/toolkit";
import sub from "date-fns/sub";

import { apiSlice } from "../api/apiSlice";

const postsAdapter = createEntityAdapter({
    sortComparer: (a, b) => b.date.localeCompare(a.date)
})
const initialState = postsAdapter.getInitialState()


export const extendedApiSlice = apiSlice.injectEndpoints({
    endpoints:builder => ({
        getPosts:builder.query({
            query:() => "/posts",
            transformResponse:result => {
                // この上のresult は、APIエンドポイントから直接返される生のレスポンスデータです。即ちポストのリストリスト
                let min = 1;
                const loadedPosts = result.map(post => {
                    if(!post?.date)post.date = sub(new Date(), {minutes:min++}).toISOString()
                    if(!post?.reactions)post.reactions = {
                        thumbsup:0,
                        wow:0, 
                        heart:0,
                        rocket:0, 
                        coffee:0,                        
                    } 
                    return post
                })
                return postsAdapter.setAll(initialState, loadedPosts)
            },
            providesTags:(result, err, arg) => [
                // この上のresult は、上記の transformResponse で最終的に返されたデータ、つまり postsAdapter.setAll(initialState, loadedPosts) の結果で、ids, entitiesというキーを持つ
                {type:"Post", id:"LIST"}, ...result.ids.map(id => ({type:"Post", id}))
            ]
        }),
        getPostsByUserId:builder.query({
            query:id => `/posts/?userId=${id}`,
            transformResponse:result => {
                let min = 1;
                const loadedPosts = result.map(post => {
                    if(!post?.date)post.date = sub(new Date(), {minutes:min++}).toISOString()
                    if(!post?.reactions)post.reactions = {
                        thumbsup:0,
                        wow:0, 
                        heart:0,
                        rocket:0, 
                        coffee:0,                        
                    } 
                    return post
                })
                return postsAdapter.setAll(initialState, loadedPosts)
            }, 
            providesTags:(result, err, arg) => {
                console.log(result)
                return [
                    ...result.ids.map(id => ({type:"Post", id}))
                ]
            }
        }),
        addNewPost:builder.mutation({
            query:initialPost => ({
                url:"/posts",
                method:"POST",
                body:{
                    ...initialPost,
                    userId:Number(initialPost.userId),
                    date:new Date().toISOString,
                    reactions:{
                        thumbsup:0,
                        wow:0, 
                        heart:0,
                        rocket:0, 
                        coffee:0,     
                    },
                }
            }),
            invalidatesTags:[{type:"Post", id:"LIST"}]
        }),
        updatePost:builder.mutation ({
            query:initialPost => ({
                url:`/posts/${initialPost.id}`,
                method:"PUT",
                body:{...initialPost, date:new Date().toISOString}
            }), 
            invalidatesTags:(result, error, arg) => [{type:"Post", id:arg.id}]
        }), 
        delete:builder.mutation ({
            query:({id}) => ({
                url:`/posts/${id}`,
                method:"DELETE",
                body:{id},
            }), 
            invalidatesTags:(result, error, arg) => [{type:"Post", id:arg.id}]
        }), 
        addReactions:builder.mutation({
            query:({postId, reactions}) => ({
                url:`/posts/${postId}`,
                method:"PATCH",
                body:{reactions}
            }),
            // optimistic update→UIを先にupdateして(UIに変化をすぐに見せて)その後にバックエンドにupdateのリクエストを送る送る
            async onQueryStarted({postId, reactions}, {dispatch, queryFulfilled}){
                // queryFulfilledはPromise
                // 下のコード(cacheをupdateしている)でどのエンドポイントのcacheをinvalidateしてupdateするべきか"getPosts"と書くことで指定, undefinedはcache keyを書く場所でgetPostsはもともとtagを持っていないのでundefinedと書く。draftはgetPostsをリクエストして帰ってきたデータを指す(即ちnormalizedされたポストリスト) 
                const patchResult = dispatch(
                    extendedApiSlice.util.updateQueryData("getPosts", undefined, draft => {
                        const post = draft.entities[postId]
                        if(post) post.reactions = reactions
                    })
                )
                try{
                    // バックエンドにupadteのリクエストを送る
                    await queryFulfilled
                }catch{
                    // もし失敗すればこのoptimistic updateは取り消す
                    patchResult.undo()
                }
            }
        })

        

    })
})
export const {useGetPostsQuery, useGetPostsByUserIdQuery, useAddNewPostMutation, useDeleteMutation, useUpdatePostMutation, useAddReactionsMutation} = extendedApiSlice



export const selectPostsResult = extendedApiSlice.endpoints.getPosts.select()
// この下のコードはgetPostsのresultオブジェクトのdataプロパティーのみを取得するための定義 **
const selectPostsResultData = createSelector(
    selectPostsResult, result => result.data
) 
//getSelectors creates these selectors and we rename them with aliases using destructuring
export const {
    selectAll: selectAllPosts,
    selectById: selectPostById,
    selectIds: selectPostIds
    // Pass in a selector that returns the posts slice of state
} = postsAdapter.getSelectors(state => selectPostsResultData(state) ?? initialState)
// ??がある理由はサイトが一番最初にロードされる際はdata fetchingしないといけないので、まだresult.dataは空なので(undefinedなので)??を用いてその時は、initialStateを返すようにする



// **
// この下のコードはgetPostsのresultオブジェクトの例
// {
//     status: 'pending' | 'fulfilled' | 'rejected',  // リクエストのステータス
//     data: {                                         // 実際の取得データ (transformResponseの結果)
//       ids: [1, 2, 3],                               // 投稿のIDリスト
//       entities: {                                   // 投稿データをIDごとに格納したオブジェクト
//         1: { id: 1, title: "First Post", ... },
//         2: { id: 2, title: "Second Post", ... },
//         3: { id: 3, title: "Third Post", ... }
//       }
//     },
//     error: null | { message: string },              // エラーメッセージ (リクエスト失敗時)
//     isLoading: boolean,                             // データ取得中かどうか
//     isSuccess: boolean,                             // データ取得が成功したかどうか
//     isError: boolean,                               // エラーが発生したかどうか
//     isFetching: boolean,                            // 再フェッチ中かどうか
//     fulfilledTimeStamp: number | null               // データが取得されたタイムスタンプ
//   }